// Prompt Injection Firewall: the code inside the Momen "Run code" node.
//
// Momen passes parameters in with context.getArg() and returns the result with
// context.setResult(). The node runs once per sensitive tool call (read_secrets,
// send_email) and answers "BLOCK" or "ALLOW". A Condition node after it routes the
// Actionflow based on that single word.
//
// Parameters (all Text):
//   p_text    last untrusted text returned by the read_inbox tool (session_context.last_read_text)
//   p_to      recipient of send_email (empty for read_secrets)
//   p_tool    "send_email" or "read_secrets"
//   p_enabled settings.firewall_enabled ("true" / "false")

const text = String(context.getArg('p_text') || '').toLowerCase();
const recipient = String(context.getArg('p_to') || '').toLowerCase();
const tool = String(context.getArg('p_tool') || '');
const enabled = String(context.getArg('p_enabled')).toLowerCase() === 'true';

// [pattern, points]. Points add up to a risk score (higher = more suspicious).
const rules = [
  [/ignore (all |any )?(previous|prior|above) (instructions|rules)/, 40], // override attempt
  [/(forward|send|email|share).{0,40}(password|secret|api key|credential|token)/, 40], // exfiltration request
  [/read_secrets|read secrets/, 30], // asks the assistant to touch the secrets tool
  [/you are now|new instructions|system prompt|developer mode/, 25], // role switch
  [/do not (tell|inform|mention).{0,20}(user|anyone)/, 25], // secrecy demand
  [/[\u200b-\u200f\u2060\ufeff]/, 20], // hidden zero-width characters
  [/<!--|display\s*:\s*none|font-size\s*:\s*0/, 20], // hidden markup
  [/(urgent|immediately).{0,40}(ceo|admin|it department)/, 10] // authority pressure
];

let score = 0;
for (const [re, pts] of rules) {
  if (re.test(text)) score += pts;
}

// Deterministic policy layer: sending to a non-company address after reading
// even mildly suspicious content is blocked, regardless of the keyword score.
const external = tool === 'send_email' && recipient !== '' && !recipient.endsWith('@company.com');
const risky = score >= 40 || (external && score >= 20);

context.setResult(enabled && risky ? 'BLOCK' : 'ALLOW');
