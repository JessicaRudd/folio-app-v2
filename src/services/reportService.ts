import { Octokit } from "octokit";

export const handleReport = async (req: any, res: any) => {
  try {
    const { message, identity, url, userAgent, summary, type = 'feedback', stack } = req.body;
    const token = process.env.GITHUB_FEEDBACK_TOKEN;
    const owner = process.env.GITHUB_REPO_OWNER;
    const repo = process.env.GITHUB_REPO_NAME;

    if (!token || !owner || !repo) {
      console.error("Missing GitHub configuration");
      if (typeof res.status === 'function') {
        return res.status(500).json({ error: "Server configuration error" });
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: "Server configuration error" }));
      }
    }

    const octokit = new Octokit({ auth: token });

    const isError = type === 'error';
    const label = isError ? 'bug' : 'feedback';
    const titlePrefix = isError ? '[Auto Error Report]' : '[User Feedback]';

    const body = `
### ${isError ? 'Error Details' : 'User Feedback'}
${message}

${stack ? `**Stack Trace:**\n\`\`\`\n${stack}\n\`\`\`` : ''}

**Identity:** ${identity || 'Guest'}
**URL:** ${url}
**User-Agent:** ${userAgent}
**Timestamp:** ${new Date().toISOString()}
    `.trim();

    await octokit.rest.issues.create({
      owner,
      repo,
      title: `${titlePrefix} - ${summary || (isError ? 'Application Error' : 'New Feedback')}`,
      body,
      labels: [label]
    });

    if (typeof res.json === 'function') {
      res.json({ success: true });
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    }
  } catch (error: any) {
    console.error("GitHub API Error:", error);
    if (typeof res.status === 'function') {
      res.status(500).json({ error: "Failed to submit feedback" });
    } else {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "Failed to submit feedback" }));
    }
  }
};
