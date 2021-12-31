const fs = require('fs/promises')
const path = require('path')
const cheerio = require('cheerio')
const async = require('async')
const INPUT = './temp/A'
const IMAGES = './temp/I'
const OUTPUT = './output'

const parseFile = async file => {
        const body = await fs.readFile(path.join(INPUT, file))
        const $ = cheerio.load(body)
        const title = $('.mw-headline').first().text().trim()
        let summary = ''
        let paragraphs = $('#mf-section-0 > p')
        for (let i = 0; i < paragraphs.length; i++) {
            summary = $(paragraphs.get(i)).text().trim().replace(/(\s*\n\s*)+/g, ' ')
            if (summary !== '') {
                break
            }
        }
        let image = ''
        try {
          const ignore = [
            'OOjs_UI_icon_table-merge-cells.svg.png.webp',
            'Loudspeaker.svg.png.webp',
            'OOjs_UI_icon_edit-ltr-progressive.svg.png.webp'
          ]
          while (image === '' || ignore.indexOf(image) !== -1) {
            image = decodeURIComponent(path.basename($('img').first().attr('src') || '').trim())
          }
          await fs.access(path.join(IMAGES, image))
        } catch(e) {
            console.error(`Image ${image} missing`)
            image = ''
        }
        return {
            title, summary, image, url: file
        }
}

const writeEntry= async (content, index) => {
    const { image } = content
    await fs.writeFile(path.join(OUTPUT, 'articles', `${index}.json`), JSON.stringify(content))
    const src = path.join(IMAGES, image)
    const dest = path.join(OUTPUT, 'images', image)
    try {
        await fs.link(src, dest)
    } catch(e) {
        if (e.code !== 'EEXIST') {
            console.error(e)
        }
    }
}

const main = async () => {
    const files = await fs.readdir(INPUT)
    const content = (await async.mapLimit(files, 15, parseFile))
        .filter(v => v.image !== '' && v.title !== '' && v.summary !== '')
    await fs.writeFile(path.join(OUTPUT, '00_index_count.txt'), content.length.toString())
    await async.eachOfLimit(content, 15, writeEntry)
    console.log(content.length)
}

main()
