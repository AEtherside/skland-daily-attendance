import assert from 'node:assert'
import process from 'node:process'
import { doAttendanceForAccount } from './src'
import 'dotenv/config'

assert(typeof process.env.SKLAND_TOKEN === 'string')

const accounts = Array.from(process.env.SKLAND_TOKEN.split(','))
const withServerChan = process.env.SERVERCHAN_SENDKEY
const withBark = process.env.BARK_URL
const withMessagePusher = process.env.MESSAGE_PUSHER_URL

// eslint-disable-next-line antfu/no-top-level-await
await Promise.all(accounts.map(token => doAttendanceForAccount(token, { withServerChan, withBark, withMessagePusher })))
