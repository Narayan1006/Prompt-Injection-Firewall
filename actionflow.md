# Actionflow: `run_tool`

The project's plan allowed one Actionflow, so all three tools are branches of a single flow selected by
`tool_name`. The dashboard buttons call it directly.

**Inputs (all Text):** `tool_name`, `to_address`, `body`
**Output:** `result` (Text), bound to the Actionflow variable `result_text`

A top-level **Condition** node branches on `tool_name`:

## Branch 1: `send_email` (guarded)

1. Query `settings` (for `firewall_enabled`).
2. Query `session_context` (for `last_read_text`).
3. **Run code** (`firewall_rules.js`) with `p_text = last_read_text`, `p_to = to_address`,
   `p_tool = "send_email"`, `p_enabled = firewall_enabled`. Output type: Text (`BLOCK` or `ALLOW`).
4. **Condition** on the Run code output:
   - `BLOCK`: insert a `decisions` row (verdict `block`, reason `prompt injection detected`), then set
     `result_text = "Blocked by firewall"`. **No `outbox` row is written.**
   - `ALLOW`: insert the `outbox` row (`to_address`, `body`), insert a `decisions` row (verdict `allow`),
     then set `result_text = "Email sent"`.

The side effect (writing to `outbox`) sits inside the ALLOW branch on purpose: once a row is written it
cannot be taken back, so the check has to happen first.

## Branch 2: `read_secrets` (guarded)

1. Query `settings`, `session_context`, and `secrets`.
2. Set `result_text` to the secret value.
3. **Run code** with `p_tool = "read_secrets"` and an empty `p_to`.
4. **Condition** on the Run code output:
   - `BLOCK`: insert a `decisions` row (verdict `block`) and **overwrite** `result_text` with
     `"Blocked by firewall"`, so the secret never leaves the flow.
   - `ALLOW`: insert a `decisions` row (verdict `allow`).

Reading a secret has no side effect, so here the value is fetched first and replaced if the call is blocked.

## Branch 3: `read_inbox` (the untrusted source)

1. Query `emails` (the first row).
2. **Update** `session_context.last_read_text` with the email `body`, so later calls know what untrusted
   text the assistant has seen.
3. Set `result_text` to the email body.

## Notes on how Momen behaves

- Momen's `Run code` node reads parameters with `context.getArg('name')` and returns a value with
  `context.setResult(...)`. A plain `Text` output type worked reliably; an `Object` output type did not.
- Boolean fields (such as `firewall_enabled`) cannot be compared against typed text in a Condition node, so
  the ON/OFF check happens inside the Run code (`p_enabled`) and the Condition only compares `BLOCK`/`ALLOW`.
- The dashboard page spaces the three `run_tool` calls of "Run attack" with a 1,100 ms timer to stay under the
  gateway's write-rate limit.
