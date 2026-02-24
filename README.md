# Repo-Ninja

AI-powered command center for GitHub development. Delegate scaffolding, code reviews, issue resolution, and best practices audits to GitHub Copilot agents -- all grounded in your team's own knowledge base.

Built with Next.js, GitHub Copilot SDK, ChromaDB, and Octokit.

## Quick Start

```bash
git clone https://github.com/rickcau/Repo-Ninja.git
cd Repo-Ninja
cp .env.example .env.local   # Add your GitHub OAuth credentials
docker-compose up             # Starts Next.js app + ChromaDB
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

See [docs/README.md](docs/README.md) for full documentation, including:

- Problem statement and solution overview
- Feature descriptions
- Prerequisites and setup instructions
- Architecture overview
- Responsible AI notes

## Challenge

This project is a submission for the **GitHub Copilot SDK Enterprise Challenge (Q3 FY26)**.

## License

See [LICENSE](LICENSE).
