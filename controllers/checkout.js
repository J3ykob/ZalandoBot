const EventEmitter = require('events')
require('events').EventEmitter.defaultMaxListeners = 55
const fs = require('fs')
const path = require('path')

const { useProxy } = require('puppeteer-page-proxy')
const puppeteer = require('puppeteer-extra')
const UserAgent = require('user-agents')

const chalk = require('chalk')

const { login } = require('./login')
const { createCheckout, checkoutData } = require('./createCheckout')
const { addToCart } = require('./addToCart')
const { randomMovement } = require('./randomMovement')
const { setupParimeter } = require('./setupParimeter')
const { prepareProxy } = require('./helper')
const { checkCartDetails } = require('./checkCartDetails')

let masterConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '/../config.json'), 'utf-8'))

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const { toNamespacedPath } = require('path')
puppeteer.use(StealthPlugin())
;(async () => {
	const configIndex = process.argv.slice(2)

	const config = masterConfig.account_data[configIndex]
	console.log(masterConfig.account_data[configIndex], configIndex)
	const reloadTime = masterConfig.reloadTime
	const startTime = masterConfig.startTime
	const name = 'Instance ' + config.user

	const cartEmiter = new EventEmitter()
	// const { getGlobalEmitter } = require('../app')
	// const globalEmitter = getGlobalEmitter()

	let globalEmitter = new EventEmitter()

	let myProxy = prepareProxy(masterConfig.proxies)
	let headers = {}
	let offset = (reloadTime * configIndex) / masterConfig.account_data.length
	let timer = 0
	let eTag = ''
	let allItemsInCart = false

	console.log(myProxy)

	const browser = await puppeteer.launch({
		headless: false,
		args: [myProxy.pass ? `--proxy-server=http://${myProxy.address}` : ''],
	})
	const page = await browser.newPage()

	if (myProxy.pass) {
		await page.authenticate({
			username: myProxy.user,
			password: myProxy.pass,
		})
	}

	await page.goto('https://www.zalando.pl/login?target=/myaccount/', { waitUntil: 'networkidle0' })
	await login(page, config.user, config.pass, name)

	page.on('dialog', async (dialog) => {
		await dialog.dismiss()
	})

	addToCart(cartEmiter, myProxy, masterConfig, browser)
	checkCartDetails(
		cartEmiter,
		globalEmitter,
		offset,
		myProxy,
		masterConfig,
		'Carter' + ' in ' + name,
		browser,
		reloadTime
	)
	// offset += reloadTime / config.proxy
	// proxyIndex += 1

	await page.setRequestInterception(true)

	async function getHeaders(req) {
		headers = Object.assign({}, headers, req.headers())
		req.continue()
	}
	page.on('request', getHeaders)

	cartEmiter.on('allItemsInCart', () => {
		console.log('All items in cart')
		allItemsInCart = true
	})

	await randomMovement(page)

	await createCheckout(page)

	page.on('request', async (req) => {
		if (req.url() == 'https://www.zalando.pl/api/checkout/buy-now' && req.resourceType() == 'document') {
			const options = {
				method: 'POST',
				postData: String.raw`{"checkoutId":"${checkoutData()[0]}", "eTag":"\"${eTag}\""}`,
				headers: Object.assign({}, req.headers(), headers, { 'content-type': 'application/json' }),
			}
			req.continue(options)
			console.log(chalk.green(name + ' checkout SUCCESSFUL! Finished in ', new Date() - timer))
		} else if (req.url() == 'https://www.zalando.pl/checkout/confirm' && req.resourceType() == 'document') {
			req.continue()
		}

		//else req.abort()
	})
	page.on('response', async (res) => {
		if (res.url() == 'https://www.zalando.pl/checkout/confirm') {
			eTag = await res.text()
			eTag = eTag.split(String.raw`eTag&quot;:&quot;\&quot;`)[1].split(String.raw`\&quot;&quot;,`)[0]
			page.goto('https://www.zalando.pl/api/checkout/buy-now')
		}
	})

	cartEmiter.on('addedToCart', (timing) => {
		timer = timing
		page.off('request', getHeaders)
		page.reload()
	})
	globalEmitter.on('addedToCart', (timing) => {
		timer = timing
		page.off('request', getHeaders)
		page.reload()
	})

	// cartEmiter.on('allItemsInCart', () => {
	// 	checkCartDetails(cartEmiter, offset, proxyData, config, 'Proxy ' + proxyIndex + ' in ' + name, browser, reloadTime)
	// })

	// cartEmiter.on('readyToCart', () => {
	// 	startCarting += 1
	// 	if (startCheckout && startCarting >= 1) cartEmiter.emit('startCarting')
	// })
	// cartEmiter.on('readyToCheckout', () => {
	// 	startCheckout = true
	// 	if (startCarting >= 1) cartEmiter.emit('startCarting')
	// })

	// while (getTiming()) {}

	if (allItemsInCart) cartEmiter.emit('startCarting')

	// setTimeout(() => {
	// 	cartEmiter.emit('startCarting')
	// }, startTime - new Date())
})()

function getTiming(startDate) {
	let dateParameter = new Date(2021, 2, 22, 8, 42, 50)
	let today = new Date()
	return dateParameter.getTime() < today.getTime() && dateParameter.getDate() === today.getDate()
}
