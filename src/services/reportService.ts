import { Octokit } from "octokit";

export const handleReport = async (req: any, res: any) => {
  try {
    const { message, identity, url, userAgent, summary, type = 'feedback', stack } = req.body;
    const token = process.env.GITHUB_FEEDBACK_TOKEN?.trim();
    const owner = process.env.GITHUB_REPO_OWNER?.trim();
    const repo = process.env.GITHUB_REPO_NAME?.trim();

    if (!token || !owner || !repo) {
      console.error("Missing GitHub configuration:", { 
        hasToken: !!token, 
        hasOwner: !!owner, 
        hasRepo: !!repo,
        owner,
        repo
      });
      if (typeof res.status === 'function') {
        return res.status(500).json({ 
          success: false,
          error: "Server configuration error",
          details: "Missing environment variables on server" 
        });
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false,
          error: "Server configuration error" 
        }));
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
    const errorMessage = error.message || "Failed to submit feedback";
    if (typeof res.status === 'function') {
      res.status(500).json({ 
        success: false,
        error: "Failed to submit feedback",
        details: errorMessage
      });
    } else {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        success: false,
        error: "Failed to submit feedback",
        details: errorMessage
      }));
    }
  }
};
