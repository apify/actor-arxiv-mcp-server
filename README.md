## ArXiv MCP server Actor

## ArXiv MCP server Actor

> 🔍 Enables AI assistants to search for and access arXiv papers through a simple MCP interface.

The ArXiv MCP Server provides a bridge between AI assistants and arXiv's research repository through the Model Context Protocol (MCP). It allows AI models to search for papers and access their content in a programmatic way.

**All credit belongs to the original authors of [ArXiv MCP Server](https://github.com/blazickjp/arxiv-mcp-server)**.

## Core features ✨

- 🔎 **Paper Search**: Query arXiv papers with filters for date ranges and categories
- 📄 **Paper Access**: Download and read paper content
- 📋 **Paper Listing**: View all downloaded papers
- 🗃️ **Local Storage**: Papers are saved locally for faster access
- 📝 **Prompts**: A Set of Research Prompts

## How to use 🚀

Connect your MCP client to `https://jakub-kopecky--arxiv-mcp-server.apify.actor/sse` with the following headers:
```
Authorization: Bearer YOUR_APIFY_TOKEN
```

## Open source 🌟

This project is open-source and available on [GitHub](https://github.com/apify/actor-arxiv-mcp-server). 🐙✨
