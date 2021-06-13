const chalk = require('chalk')
const fs = require('fs')
let config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'))

const EventEmitter = require('events')
globalEmitter = new EventEmitter()

const { spawn } = require('child_process')

const runningTasks = []

for (instanceIndex in config.account_data) {
	runTask(instanceIndex)
}

function runTask(instanceIndex) {
	let args = ['/c', 'node', __dirname + '\\controllers\\checkout.js']
	args.push(instanceIndex)
	runningTasks.push(args)

	const instance = spawn('cmd.exe', args, { shell: true, detached: true })

	instance.stdout.on('data', (data) => {
		console.log(`Instance ${instanceIndex}: ${data.toString()}`)
	})

	instance.stderr.on('data', (data) => {
		console.error(`Error ${instanceIndex}: ${data.toString()}`)
	})

	instance.on('exit', (code) => {
		console.log(`Child exited with code ${code}`)
		setTimeout(() => {
			runTask(instanceIndex)
		}, 1000)
	})
}

console.log('App starting...')

let index = 1

console.log('Instances running')

exports.getGlobalEmitter = () => {
	return globalEmitter
}
