# Minimal slackbot reproduction

Used for finding a solution to https://github.com/slackapi/bolt-js/issues/1631.

# Setup

1. create a `.env.local` with the following values:

```
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
```

2. Set up Netlify; `npx netlify init`
3. Deploy to Netlify `npm run deploy` or run locally `npm run live`
4. Gather deployed endpoint and add it to your Slackbot's
   "slash commands" and "interactivity and shortcuts" settings
