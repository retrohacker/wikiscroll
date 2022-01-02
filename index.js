const fs = require('fs/promises')
const path = require('path')
const cheerio = require('cheerio')
const async = require('async')
const INPUT = './temp/A'
const IMAGES = './temp/I'
const OUTPUT = './output'
const stripNewlines = /(\s*\n\s*)+/g

const parseFile = async file => {
        const body = await fs.readFile(path.join(INPUT, file))
        const $ = cheerio.load(body)
        const title = $('.mw-headline').first().text().trim()
        let summary = ''
        let paragraphs = $('#mf-section-0 > p')
        for (let i = 0; i < paragraphs.length; i++) {
            summary = $(paragraphs.get(i)).text().trim().replace(stripNewlines, ' ')
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
          const images = $('img')
          for (let i = 0; i < images.length; i++) {
            image = decodeURIComponent(path.basename(images.get(i).attribs['src'] || '').trim())
            if (image !== '' && ignore.indexOf(image) === -1) {
              break
            }
          }
          await fs.access(path.join(IMAGES, image || ''))
        } catch(e) {
            console.error(`Image ${image} missing for ${file}`)
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
    let i = 0;
    const content = (await async.mapLimit(files, 15, async (content, index) => {
            const result = await parseFile(content, index);
            if (++i % 100 === 0) {
                console.log(`Processed: ${i} / ${files.length}`)
            }
            return result
        }))
        .filter(v => v.image !== '' && v.title !== '' && v.summary !== '' && v.url !== '')
    await fs.writeFile(path.join(OUTPUT, '00_index_count.txt'), content.length.toString())
    await async.eachOfLimit(content, 15, writeEntry)
    console.log(content.length)
}

main()
