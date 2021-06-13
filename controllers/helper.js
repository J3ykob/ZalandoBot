exports.prepareProxy = (proxyList) => {
	try {
		config = proxyList[Math.floor(Math.random() * proxyList.length)] || ''
		let myProxy = {
			address: config.split(':')[0] || '127.0.0.1' + ':' + (config.split(':')[1] || '8080'),
			user: config.split(':')[2] || '',
			pass: config.split(':')[3] || '',
		}
		return myProxy
	} catch (e) {
		throw `Error while parsing the proxy: ${e}`
	}
}
