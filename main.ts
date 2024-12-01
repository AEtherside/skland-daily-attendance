// import assert from 'node:assert'
// import 'dotenv/config'
// import process from 'node:process'
// import { doAttendanceForAccount } from './src'

import { get_d_id } from "./src/did";

// assert(typeof process.env.SKLAND_TOKEN === 'string')

// const accounts = Array.from(process.env.SKLAND_TOKEN.split(','))
// const withServerChan = process.env.SERVERCHAN_SENDKEY
// const withBark = process.env.BARK_URL

// await Promise.all(accounts.map(token => doAttendanceForAccount(token, { withServerChan, withBark })))


console.log(await get_d_id())
