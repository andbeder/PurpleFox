# sfdcAuthorizer Agent

**Script Path**: `scripts/agents/sfdcAuthorizer.js`

## Description

The `sfdcAuthorizer` agent performs a JWT-based login using the Salesforce CLI. It sets the default username for subsequent automation commands so other agents can interact with the target org. Before initiating the login flow, the agent looks for `./tmp/access_token.txt` and validates the token against Salesforce. When accepted, the token is reused and the login step is skipped.

## Installation Script

Before running the agent, ensure the Salesforce CLI is installed. You can add this script to your CI pipeline or local setup step:

```bash
#!/usr/bin/env bash
# Install Salesforce CLI if not already present
if ! command -v sf &> /dev/null; then
  echo "Salesforce CLI not found. Installing..."
  npm install --global @salesforce/cli --silent
else
  echo "Salesforce CLI already installed."
fi
```

## Inputs

- Environment variables:
  - `SFDC_USERNAME`: Username of the Salesforce integration user.
  - `SFDC_CLIENT_ID`: Connected App consumer key.
  - `SFDC_LOGIN_URL` (optional): Login URL, defaults to `https://login.salesforce.com`.

## Behavior

1. Validate required environment variables and presence of the `jwt.key` file at the project root.
2. Execute the JWT auth flow:
   ```bash
   sf org login jwt \
     --client-id $SFDC_CLIENT_ID \
     --jwt-key-file ./jwt.key \
     --username $SFDC_USERNAME \
     --instance-url $SFDC_LOGIN_URL \
     --set-default
   ```
3. On success, the authenticated org becomes the default username for the CLI.
4. Exit with a non-zero code and error message on failure.

## Dependencies

- Node.js ≥ 14
- Salesforce CLI (`sf`) installed and accessible in the PATH (see Installation Script).

## CLI Usage

```bash
node scripts/agents/sfdcAuthorizer.js
```

## Output

- Authenticated Salesforce CLI session with the default username set.
