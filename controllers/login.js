const chalk = require('chalk')

const { randomMovement } = require('./randomMovement')
const UserAgent = require('user-agents')

exports.login = async (page, username, password, name) => {
	let todo = [
		async function () {
			await page.waitForSelector('#login\\.email')
			await page.click('#login\\.email', { delay: 30 })
		},
		async function () {
			await page.waitForSelector('#login\\.email')
			await page.waitForTimeout(Math.random() * 100)
			await page.type('#login\\.email', username)
		},
		async function () {
			await page.waitForSelector('#login\\.password')
			await page.click('#login\\.password', { delay: 30 })
		},
		async function () {
			await page.waitForSelector('#login\\.password')
			await page.waitForTimeout(Math.random() * 100)
			await page.type('#login\\.password', password)
		},
		// async function () {
		// 	await page.waitForSelector('#login\\.email')
		// 	await page.click('#login\\.email', { delay: 50, clickCount: 3 })
		// 	await page.type('#login\\.email', username)

		// },
		// async function () {
		// 	await page.waitForSelector('#login\\.password')
		// 	await page.click('#login\\.password', { delay: 50, clickCount: 3 })
		// 	await page.type('#login\\.password', password)

		// },
	]

	// if (Math.floor(Math.random() * 2)) {
	// 	await page.goto('https://www.zalando.pl/login?target=/myaccount/', { waitUntil: 'networkidle0' })
	// }

	const inputValuePassword = await page.evaluate(() => {
		return document.querySelector('#login\\.password').value
	})
	for (let i = 0; i < inputValuePassword.length; i++) {
		await page.focus('#login\\.password')
		await page.keyboard.press('Backspace')
	}
	await page.waitForTimeout(Math.random() * 1000 + 1000)
	const inputValueEmail = await page.evaluate(() => {
		return document.querySelector('#login\\.email').value
	})
	for (let i = 0; i < inputValueEmail.length; i++) {
		await page.focus('#login\\.email')
		await page.keyboard.press('Backspace')
	}

	await page.waitForTimeout(Math.random() * 1000)

	try {
		for (let i = todo.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			;[todo[i], todo[j]] = [todo[j], todo[i]]
		}

		await randomMovement(page)

		for (f in todo) {
			await todo[f]()
			if (Math.floor(Math.random() * 2)) {
				await page.waitForTimeout(Math.random() * 400)
			}
		}

		await randomMovement(page)
		await page.waitForTimeout(500)
		await page.evaluate(() => {
			document.querySelector('button[data-testid="login_button"]').click()
		})
		// await page.click('button[data-testid="login_button"]', {delay:30})
		// await page.waitForTimeout(500)
		// await page.focus('button[data-testid="login_button"]');
		await page.keyboard.press('Enter')
		await page.waitForNavigation({ timeout: 8000 })
		if (page.url() != 'https://www.zalando.pl/myaccount/') throw 'Not navigated'
		console.log(chalk.blue('Login ' + name + ': Success'))
	} catch (e) {
		console.log(chalk.red('Login ' + name + ' error ' + e + ' : Retrying'))
		await page.screenshot({ path: 'buddy-screenshot.png' })
		// const userAgent = new UserAgent()
		// await page.setUserAgent(userAgent.toString())
		await this.login(page, username, password, name)
	}
}
