# Optional Work browser integration

SKYSHIFT and its independent Playwright tests do not require this integration.

1. Open desktop app Settings with **Ctrl+,** on Windows, or use the app menu.
2. Select **Browser**. Enable/install the bundled Browser plugin if prompted.
3. Under **Agent permissions**, allow **Browse** and **Download** for `http://localhost:3000`. Upload permission is unnecessary.
4. Return to the task and report that permission is enabled, so the supported integration can be retried.

If controls are locked, an administrator must review the applicable workspace/managed browser policy. User permission cannot override an administrator denial. The tool error does not establish which toggle or policy caused the restriction; no undocumented toggle name is assumed. No account setting was changed automatically.

Sources checked 16 October 2026: [desktop settings](https://learn.chatgpt.com/docs/app/settings), [Work local security](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-local-security). The official guide names Browser, Agent permissions and Browse/Download/Upload controls. The error phrase “local browser use disabled” is not itself a verified toggle label.
