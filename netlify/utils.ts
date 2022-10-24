// Reference:
// https://github.com/ClydeDz/netlify-functions-slack-demo/blob/3b5ccd0504511bbf95b2bb1e05f3fabe23d078f6/src/utils.ts
import { App, ReceiverEvent } from '@slack/bolt'

interface IBaseSlackReply {
  app: App
  botToken: string | undefined
  channelId: string
  threadTimestamp: string
}
export interface ISlackReactionReply extends IBaseSlackReply {
  reaction: string
}
export interface ISlackReply extends IBaseSlackReply {
  message: string
}
export interface ISlackPrivateReply
  extends Omit<ISlackReply, 'threadTimestamp'> {
  channel: string
  user: string
  text: string
}
export interface IHandlerResponse {
  statusCode: number
  body: string
}

export function isUrlVerificationRequest(payload: { type?: string }): boolean {
  if (payload && payload.type && payload.type === 'url_verification') {
    return true
  }
  return false
}

export function generateReceiverEvent(payload: {
  type?: string
}): ReceiverEvent {
  let body
  if (payload?.payload) {
    body = JSON.parse(payload.payload)
  } else {
    body = payload
  }

  return {
    body,
    ack: async (response: string | undefined): Promise<any> => {
      return {
        statusCode: 200,
        body: response ?? '',
      }
    },
  }
}

export function parseRequestBody(
  stringBody: string | null,
  contentType: string | undefined
): JSON | undefined {
  try {
    const inputStringBody: string = stringBody ?? ''
    const result: { [key: string]: string } = {}

    if (contentType && contentType === 'application/x-www-form-urlencoded') {
      const keyValuePairs = inputStringBody.split('&')
      keyValuePairs.forEach(function (pair: string): void {
        const individualKeyValuePair: string[] = pair.split('=')
        result[individualKeyValuePair[0]] = decodeURIComponent(
          individualKeyValuePair[1] || ''
        )
      })
      return JSON.parse(JSON.stringify(result))
    } else {
      return JSON.parse(inputStringBody)
    }
  } catch {
    return undefined
  }
}

export async function replyPrivateMessage(
  messagePacket: ISlackPrivateReply
): Promise<void> {
  console.log(
    'posting to channel',
    messagePacket.channel,
    'as user',
    messagePacket.user
  )
  try {
    await messagePacket.app.client.chat.postEphemeral({
      channel: messagePacket.channel,
      user: messagePacket.user,
      text: messagePacket.text,
    })
  } catch (error) {
    console.error(error)
  }
}
