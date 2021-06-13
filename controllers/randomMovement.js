

exports.randomMovement = async (page)=>{
    let lastURL = page.url()

    if (Math.floor(Math.random() * 2)) {
		await page.mouse.click(Math.floor(Math.random() * 400) + 100, Math.floor(Math.random() * 700) + 100, { delay: 50 })
    }
    
    await page.waitForTimeout(500)

    if (Math.floor(Math.random() * 2)) {
        await page.waitForTimeout(Math.random() * 1000)
    }
    if(page.url()!=lastURL){
        await page.goto(lastURL, {waitUntil: 'networkidle0'})
    }
    
}