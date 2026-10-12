# Repository agent guardrails

- Treat the checked-out repository and relevant current documentation as the source of truth. Inspect Git status and the task scope before editing; stop and report `BLOCKED` if unrelated changes or a material state mismatch appears.
- Keep each task within its explicitly authorized files and behavior. Do not use real customer/business data or expose secrets, credentials, certificates, or `.env` contents. Do not change GitHub settings, branch protections, rulesets, CI, deployments, or production infrastructure unless separately authorized.
- Follow the canonical GitHub Flow, authorization gates, review, and proportional QA in [`docs/ai/TASK_EXECUTION_PLAYBOOK.md`](docs/ai/TASK_EXECUTION_PLAYBOOK.md). General agent rules are in [`docs/ai/AI_AGENT_INSTRUCTIONS.md`](docs/ai/AI_AGENT_INSTRUCTIONS.md); consult only the relevant project documents for each task.
- A request to implement or create a PR does not by itself authorize commit, push, merge, branch deletion, history rewriting, or tags. Obtain explicit human authorization for each such operation. CI success is evidence, never merge authorization.
- Prefer small, reviewable changes and run only validations proportionate to the scope; reuse valid evidence for the same commit instead of repeating expensive suites without cause. Report exact commands/results and residual risks.
- Do not broaden a task to another phase. Report out-of-scope findings separately without fixing them.
