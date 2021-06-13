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

exports.addToCart = async (emiter, proxy, config, browser) => {
	let headers = {}
	let timing = new Date()

	const addPage = await browser.newPage()

	console.log('proxy')

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

	await addPage.goto('https://www.zalando.pl/api/cart/details')
	const details = JSON.parse(
		await addPage.evaluate(() => {
			return document.querySelector('pre').innerHTML
		})
	)

	const skusToAdd = []
	config.skus.forEach((element) => {
		let my_product = details.unavailableArticles
			.map((productInCart) => {
				return productInCart.simpleSku
			})
			.indexOf(element)
		console.log(my_product)

		for (let i = 0; i < 5 - (my_product == -1 ? 0 : details.unavailableArticles[my_product].quantity); i++) {
			skusToAdd.push(element)
		}
	})

	// emiter.on('startCarting', () => {
	let step = 0
	addPage.off('request', getHeaders)
	addPage.on('request', async (req) => {
		if (req.resourceType() != 'document' && req.url() != 'https://www.zalando.pl/api/graphql') req.abort()
		else {
			const options = {
				method: 'POST',
				headers: Object.assign({}, req.headers(), headers, { 'content-type': 'application/json' }),
				postData: `[{"id":"e7f9dfd05f6b992d05ec8d79803ce6a6bcfb0a10972d4d9731c6b94f6ec75033","variables":{"addToCartInput":{"productId":"${
					// config.skus[Math.floor(Math.random() * config.skus.length)]
					skusToAdd[step++]
				}","clientMutationId":"addToCartMutation"}}}]`,
			}
			req.continue(options)
		}
	})
	addPage.on('response', async (res) => {
		if ((await res.url()) == 'https://www.zalando.pl/api/graphql') {
			if ((await res.text()) == '[{"data":{"addToCart":{"__typename":"AddToCartPayload"}}}]') {
				if (step >= skusToAdd.length) {
					emiter.emit('allItemsInCart')
					addPage.close()
				} else {
					console.log('reloading')
					setTimeout(() => {
						addPage.reload()
					}, 2000)
				}
				// if (first) {
				// 	first = false
				// 	emiter.emit('buyEmAll')
				// 	addPage.reload()
				// 	setTimeout(() => {
				// 		emiter.emit('addedToCart', timing)
				// 		console.log(chalk.green('Add to cart: Success'))
				// 	}, 100)
				// } else {
				// 	addPage.reload()
				// }
			} else {
				step--
				setTimeout(() => {
					addPage.reload()
				}, 2000)
			}
		}
	})
	if (skusToAdd[0]) await addPage.goto('https://www.zalando.pl/api/graphql')
	else {
		emiter.emit('allItemsInCart')
		addPage.close()
	}

	// timing = new Date()
	// let offsetTimeout = setTimeout(() => {
	// 	addPage.goto('https://www.zalando.pl/api/graphql')
	// 	setInterval(() => {
	// 		// addPage.goto('https://www.zalando.pl/api/graphql')
	// 		addPage.reload()
	// 		console.log(chalk.yellow(name + ' add to cart: Retrying'))
	// 	}, reloadTime - 10)
	// }, offset)

	// emiter.on('buyEmAll', () => {
	// 	clearTimeout(offsetTimeout)
	// 	addPage.reload()
	// })
	// })

	emiter.emit('readyToCart')
	console.log(chalk.blue('All items added to cart'))
}
