const chalk = require('chalk')

const { randomMovement } = require('./randomMovement')

let checkoutData = []

const getCheckoutData = async (page) => {
	let bodyHTML = await page.evaluate(() => {
		return document.body.innerHTML
	})

	bodyHTML = JSON.parse(
		((bodyHTML.split('data-props="')[1] || '').split('" data-trans')[0] || '').replace(/&quot;/g, '"')
	)

	bodyHTML.model.checkoutId ? checkoutData.push(bodyHTML.model.checkoutId) : ''
	bodyHTML.model.eTag ? checkoutData.push(bodyHTML.model.eTag.split('"')[1].split('"')[0]) : ''
	bodyHTML.model.groups[0].articles[0].simpleSku
		? checkoutData.push(bodyHTML.model.groups[0].articles[0].simpleSku)
		: ''
	console.log(chalk.blue('Checkout session: Ready'))
}

exports.createCheckout = async (page) => {
	await page.goto('https://www.zalando.pl/checkout/confirm', { waitUntil: 'networkidle2' })

	await randomMovement(page)

	try {
		await page.waitForSelector('#delivery-destination-tab-0', { timeout: 2000 })
		await page.click('#delivery-destination-tab-0')

		await randomMovement(page)

		await page.waitForTimeout(2000)

		await page.evaluate(() => {
			return document.querySelectorAll('button')[0].click()
		})
		await page.waitForTimeout(2000)
		await getCheckoutData(page)
	} catch {
		try {
			await page.waitForSelector('.z-coast-fjord-group-list-with-shipping_articleGroup', { timeout: 2000 })
			await getCheckoutData(page)
		} catch {
			console.log(chalk.red('Checkout session error: retrying...'))
			await page.goto('https://www.zalando.pl/checkout/confirm', { waitUntil: 'networkidle2' })
			await randomMovement(page)
			await this.createCheckout(page)
		}
	}
}
exports.checkoutData = () => {
	return checkoutData
}
