import { APIGatewayEvent } from 'aws-lambda'
import { App, ExpressReceiver, ReceiverEvent, LogLevel } from '@slack/bolt'
import { Handler } from '@netlify/functions'
import 'dotenv/config'

import {
  generateReceiverEvent,
  IHandlerResponse,
  isUrlVerificationRequest,
  parseRequestBody
} from '../utils'

// How to build a slackbot on Netlify functions
// Article: https://levelup.gitconnected.com/creating-a-slack-bot-using-netlify-functions-465d2a981686
// Demo repo:
// https://github.com/ClydeDz/netlify-functions-slack-demo/blob/main/src/functions/slackbot.ts

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
})

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  logLevel: LogLevel.DEBUG
})

// /tm moderation Slash Command
app.command('/tm', async ({ body, ack, client, respond, logger }) => {
  await ack()

  const invokingUserInfo = await client.users.info({ user: body.user_id })
  if (!invokingUserInfo.user.is_admin) {
    await respond("You're not an admin.", {
      response_type: 'ephemeral'
    })
    return
  }

  if (body.text !== 'greet') {
    await respond('Please use a valid command such as `/tm greet`', {
      response_type: 'ephemeral'
    })
    return
  }

  // look up user
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'user_view',
        title: {
          type: 'plain_text',
          text: 'Request Form'
        },
        submit: {
          type: 'plain_text',
          text: 'Submit'
        },
        close: {
          type: 'plain_text',
          text: 'Cancel'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'users',
            element: {
              type: 'multi_users_select',
              action_id: 'multi_users_select-action'
            },
            label: {
              type: 'plain_text',
              text: 'Involved People'
            }
          },
          {
            type: 'input',
            block_id: 'description',
            element: {
              type: 'plain_text_input',
              action_id: 'plain_text_input-action'
            },
            label: {
              type: 'plain_text',
              text: 'Description'
            }
          }
        ]
      }
    })
  } catch (err) {
    logger.error(err)
  }
})

app.view('user_view', async ({ ack, view, client, logger }) => {
  await ack()

  logger.info('view handler')

  logger.info('Block values', view.state.values)

  const users
    = view.state.values.users['multi_users_select-action'].selected_users
  const description
    = view.state.values.description['plain_text_input-action'].value

  logger.info('values', users, description)

  // Message the user
  try {
    await client.chat.postMessage({
      channel: users[0],
      text: `Greetings, you have a message! ${description}`
    })
  } catch (error) {
    logger.error(error)
  }
})

const handler: Handler = async (
  event: APIGatewayEvent
): Promise<IHandlerResponse> => {
  console.log(event)
  const payload: any = parseRequestBody(
    event.body,
    event.headers['content-type']
  )

  if (isUrlVerificationRequest(payload)) {
    return {
      statusCode: 200,
      body: payload?.challenge
    }
  }

  const slackEvent: ReceiverEvent = generateReceiverEvent(payload)
  await app.processEvent(slackEvent)

  return {
    statusCode: 200,
    body: ''
  }
}

export { handler }
