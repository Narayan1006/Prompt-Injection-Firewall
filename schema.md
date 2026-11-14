# Data model (Momen)

Six tables hold the whole demo. Every table also has Momen's built-in `id`, `created_at` and
`updated_at` fields. Momen creates a few other tables on its own (`account`, and the AI agent tables
`conversation`, `message`, `tool_usage_record`, `message_content`). They are not used by this demo.

| Table | Fields | Purpose |
|---|---|---|
| `emails` | `sender`, `subject`, `body`, `is_attack` | Demo inbox. `read_inbox` reads one row, so the attack email is kept as the first row. |
| `outbox` | `to_address`, `body` | Messages the `send_email` tool "sent". Nothing is delivered externally; a row here is the leak the demo shows. |
| `secrets` | `name`, `value` | Fake demo values only (for example `DEMO_ONLY_NOT_A_REAL_API_KEY`). |
| `settings` | `firewall_enabled` (boolean) | The Firewall ON/OFF switch. One row. |
| `session_context` | `last_read_text` | The last untrusted text `read_inbox` returned. The firewall scores this text. One row. |
| `decisions` | `tool_name`, `args`, `score`, `verdict`, `reason` | Log of every allow/block verdict, shown newest first on the dashboard. |

## Permissions (Anonymous user, i.e. any visitor)

| Table | Read | Update | Insert | Delete |
|---|---|---|---|---|
| `settings` | yes | yes | no | no |
| `session_context` | yes | yes | no | no |
| `decisions` | yes | no | no | no |
| `outbox` | yes | no | no | no |
| `emails` | yes | no | no | no |
| `secrets` | no | no | no | no |

The dashboard needs Read on `settings` to show the Firewall state, and Update on `settings` for the
ON/OFF buttons. Rows in `decisions` and `outbox` are written by the Actionflow, not by visitors.
