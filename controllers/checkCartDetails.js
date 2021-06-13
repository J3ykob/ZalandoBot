const { useProxy } = require('puppeteer-page-proxy')
const puppeteer = require('puppeteer-extra')
const UserAgent = require('user-agents')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const chalk = require('chalk')

const { login } = require('./login')
const { setupParimeter } = require('./setupParimeter')

let first = true

const buyFromStock = false
const buyFromCart = true

exports.checkCartDetails = async (emiter, globalEmitter, offset, proxy, config, name, browser, reloadTime) => {
	let headers = {}
	let timing = new Date()

	const addPage = await browser.newPage()

	if (proxy.pass) {
		await addPage.authenticate({
			username: proxy.user,
			password: proxy.pass,
		})
	}

	addPage.on('dialog', async (dialog) => {
		await dialog.dismiss()
	})
	await addPage.goto('https://www.zalando.pl/myaccount/')

	await addPage.setRequestInterception(true)

	async function getHeaders(req) {
		headers = Object.assign({}, headers, req.headers())
		if (req.resourceType() !== 'document') req.abort()
		else req.continue()
	}
	addPage.on('request', getHeaders)

	emiter.on('startCarting', () => {
		addPage.off('request', getHeaders)

		addPage.on('request', async (req) => {
			if (req.resourceType() != 'xhr' && req.url() != 'https://www.zalando.pl/api/cart/details') req.abort()
			else {
				req.continue()
			}
		})
		addPage.on('response', async (res) => {
			if ((await res.url()) == 'https://www.zalando.pl/api/cart/details') {
				let details = JSON.parse(await res.text())

				// console.log(details)

				let articlesAvailable = details.groups[0].articles.map((e) => {
					return e.simpleSku
				})

				if (
					config.skus.some((element) => {
						articlesAvailable.indexOf(element) != -1
					})
				) {
					console.log(
						config.skus.find((element) => {
							articlesAvailable.indexOf(element) != -1
						})
					)
					globalEmitter.emit('addedToCart', timing)
					emiter.emit('addedToCart', timing)
					//globalEmitter.emit('addedToCart', timing)
					console.log(chalk.green('Product available! Trying to buy...'))
				}
			}
		})

		let offsetTimeout = setTimeout(() => {
			addPage.goto('https://www.zalando.pl/api/cart/details')
			setInterval(() => {
				addPage.reload()
				timing = new Date()
				console.log(chalk.yellow(name + ' add to cart: Retrying'))
			}, reloadTime - 10)
		}, offset)
	})

	emiter.emit('readyToCart')
	console.log(chalk.blue(name + ' ready to check for available products'))
}
