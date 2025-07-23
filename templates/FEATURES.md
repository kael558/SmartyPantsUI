# SmartyPantsUI Advanced Features

This template includes several advanced features for modern web application development.

## 🧪 A/B Testing

### How it Works

The website automatically serves different builds based on A/B test configurations. Each stage (dev, staging, production) can have its own A/B test setup.

### Configuration Files

- `ab-config-dev.json` - Development stage A/B tests
- `ab-config-staging.json` - Staging stage A/B tests
- `ab-config-production.json` - Production stage A/B tests

### A/B Test Structure

```json
{
	"enabled": true,
	"stage": "production",
	"tests": [
		{
			"name": "Hero Banner Test",
			"enabled": true,
			"variants": [
				{
					"name": "Control",
					"build": "app",
					"rollout": 60
				},
				{
					"name": "Variant A",
					"build": "hero-variant-build",
					"rollout": 40
				}
			]
		}
	],
	"defaultBuild": "app"
}
```

### Build Folders

- `app/` - Default build (Control)
- `hero-variant-build/` - Variant A build
- `other-variant-build/` - Additional variants

### User Assignment

Users are consistently assigned to variants based on their IP address/session, ensuring they always see the same version.

## 🤖 Bot Detection & SEO

### Markdown Build

When a bot is detected (Google, Bing, etc.), the system serves a simplified `markdown_build.html` file optimized for:

- Search engine crawling
- Fast loading
- Clean markup
- Structured data

### Bot Patterns Detected

- googlebot, bingbot, slurp, duckduckbot
- facebookexternalhit, twitterbot, linkedinbot
- crawler, spider, scraper, parser, reader

## 🔌 MCP (Model Context Protocol) Generation

### What is MCP?

MCP files describe your API endpoints in a standardized format that AI agents can understand and interact with.

### Generated MCP Structure

```json
{
	"name": "business-api-client",
	"version": "1.0.0",
	"description": "MCP client for business API endpoints",
	"baseUrl": "{{API_BASE_URL}}",
	"tools": [
		{
			"name": "post_api_v1_register",
			"description": "POST request to /api/v1/register",
			"inputSchema": {
				"type": "object",
				"properties": {
					"email": {
						"type": "string",
						"description": "email field in request body"
					}
				},
				"required": ["email"]
			},
			"handler": {
				"method": "POST",
				"url": "{{API_BASE_URL}}/api/v1/register",
				"headers": {
					"Content-Type": "application/json",
					"Authorization": "Bearer {{AUTH_TOKEN}}"
				},
				"body": {
					"email": "{{email}}"
				}
			}
		}
	]
}
```

### Usage

1. Generate MCP from your handler.js file
2. Replace `{{API_BASE_URL}}` with your actual API URL
3. Replace `{{AUTH_TOKEN}}` with authentication token
4. Use with AI agents that support MCP

## 🚀 Deployment Stages

### Stage-based Configuration

Each deployment stage can have:

- Different A/B test configurations
- Separate git branches
- Individual rollout percentages
- Unique deployment URLs

### Stage Management

1. **Development** - `dev` branch, full A/B testing
2. **Staging** - `staging` branch, limited testing
3. **Production** - `main` branch, careful rollouts

## 📁 File Structure

```
website/
├── app/                     # Main application build
├── markdown/                # Bot-friendly builds
│   └── markdown_build.html  # SEO-optimized page
├── variant-builds/          # A/B test variants
│   ├── hero-variant-build/  # Example variant
│   └── other-variants/      # Additional variants
├── ab-config-dev.json       # Dev A/B config
├── ab-config-staging.json   # Staging A/B config
├── ab-config-production.json# Production A/B config
└── index.js                 # Server with A/B logic
```

## ⚙️ Environment Variables

```bash
STAGE=production              # Current deployment stage
PRERENDER_TOKEN=your_token    # For bot rendering
API_BASE_URL=https://...      # For MCP generation
```

## 🔧 Development Workflow

1. **Create A/B Test** - Define variants in UI
2. **Build Variants** - Create separate builds for each variant
3. **Configure Rollouts** - Set percentage splits
4. **Deploy** - Push to stage with A/B config
5. **Monitor** - Track performance and results

## 📊 Analytics Integration

The A/B testing system logs variant selections, making it easy to integrate with analytics platforms:

```javascript
console.log(`Selected variant: ${variant.build} for test: ${test.name}`);
```

## 🛠️ Troubleshooting

### A/B Tests Not Working

1. Check if `enabled: true` in config file
2. Verify build folders exist
3. Ensure rollout percentages add up to 100
4. Check console logs for variant selection

### Bots Getting Wrong Content

1. Verify bot detection patterns
2. Check if `markdown_build.html` exists
3. Test with user agent string containing "bot"

### MCP Generation Issues

1. Ensure `handler.js` exists in `business-api/`
2. Check that endpoints follow `app.method(route, ...)` pattern
3. Verify file permissions for writing MCP

## 🎯 Best Practices

1. **A/B Testing**

   - Start with small rollout percentages
   - Test one variable at a time
   - Monitor performance metrics
   - Gradual rollout to production

2. **Bot Optimization**

   - Keep markdown builds simple and fast
   - Include structured data
   - Focus on content over styling
   - Regular SEO audits

3. **MCP Usage**
   - Keep endpoint descriptions clear
   - Use meaningful parameter names
   - Include proper authentication
   - Version your MCP files
