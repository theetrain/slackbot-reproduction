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
app.command('/tmdev', async ({ body, ack, client, respond, logger }) => {
  await ack()

  console.log('caught')

  const invokingUserInfo = await client.users.info({ user: body.user_id })
  if (!invokingUserInfo.user.is_admin) {
    await respond("You're not an admin.", {
      response_type: 'ephemeral'
    })
    return
  }

  if (body.text !== 'greet') {
    await respond('Please use a valid command such as `/tmdev greet`', {
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
  await ack({
    response_action: 'update',
    view: {
      type: 'modal',
      callback_id: 'test',
      submit: {
        type: 'plain_text',
        text: 'Submit'
      },
      close: {
        type: 'plain_text',
        text: 'Cancel'
      },
      title: {
        type: 'plain_text',
        text: 'Updated view'
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: 'New block text'
          }
        }
      ]
    }
  })

  // other logic
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
