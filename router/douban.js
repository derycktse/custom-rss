const Router = require('koa-router')
const axios = require('axios')
const cheerio = require('cheerio');
const RSS = require('rss');
const router = new Router()

const DOUBAN_URL = 'https://www.douban.com/'


router.get('/douban/group/:groupname', async (ctx, next) => {
  let rawResultList = []
  const res = await axios.get(`${DOUBAN_URL}group/${ctx.params.groupname}/discussion?start=0`)
  const $ = cheerio.load(res.data)


  // 获取列表里的文章链接
  const targetUrlList = $('#content td.title a').map((idx, item) => {
    return item.attribs.href;
  })


  // 获取小组的标题
  const urlTitle = $('title').text().trim();

  const feedOptions = {}
  feedOptions.title = urlTitle;
  feedOptions.feedUrl = `${DOUBAN_URL}feed/group/${ctx.params.groupname}/discussion`;

  // 获取文章结果
  await fetchUrl(targetUrlList, 3, rawResultList)


  // 处理内容
  contentList = rawResultList.map(stripContent)
  console.log(contentList)

  // ctx.body = res.data;
  ctx.body = `<html>
  <body>
  <div>${contentList.join('')}</div>
  </body>
  </html>`
})



/**
 * 根据URL去获取文章的内容，
 * 支持写入同时并发的url数量
 */
async function fetchUrl(list, count, rawResultList) {
  const subList = list.splice(0, count);
  if (!subList.length) return

  const pmArr = subList.map((url) => {
    return axios.get(url)
  })

  const resList = await Promise.all(pmArr);

  rawResultList.push(...resList.map((res) => {
    return {
      html: res.data,
      url: `${DOUBAN_URL}${res.request.path}`
    }
  }))

  if (list.length > 0) {
    return fetchUrl.apply(this, arguments)
  } else {
    return Promise.resolve()
  }

}


/**
 * 将需要的内容从获取的html 字符串中提取出来
 * @param  {} html
 */
function stripContent(rawItem) {
  let $ = cheerio.load(rawItem.html)
  let content = ''
  const item = {}
  try {
    item.url = rawItem.url
    item["title"] = $('h1').text().trim()
    content = $('#link-report').html().replace(/<\/?[^>]+(>|$)/g, "")
  }
  catch (e) {
    console.log('strip error')
  }
  return content
}


function rssFactory(feedOptions) {
  /* lets create an rss feed */
  const feed = new RSS({
    title: feedOptions.title,
    description: 'description',
    feed_url: feedOptions.feedUrl,
    site_url: `${DOUBAN_URL}`,
    image_url: 'https://img3.doubanio.com/favicon.ico',
    managingEditor: 'derycktse',
    webMaster: 'derycktse',
    copyright: 'derycktse',
    language: 'en',
    // categories: ['Category 1', 'Category 2', 'Category 3'],
    pubDate: 'April 28, 2018 04:00:00 GMT',
    // ttl: '60',
    custom_namespaces: {
      'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'
    },
  });

  feed.item({
    title: 'item title',
    description: 'use this for the content. It can include html.',
    url: 'http://example.com/article4?this&that', // link to the item
    // guid: '1123', // optional - defaults to url
    categories: ['Category 1', 'Category 2', 'Category 3', 'Category 4'], // optional - array of item categories
    // author: 'Guest Author', // optional - defaults to feed author property
    date: 'May 27, 2012', // any format that js Date can parse.
    lat: 33.417974, //optional latitude field for GeoRSS
    long: -111.933231, //optional longitude field for GeoRSS
    enclosure: { url: '...', file: 'path-to-file' }, // optional enclosure
    custom_elements: [
      { 'itunes:author': 'John Doe' },
      { 'itunes:subtitle': 'A short primer on table spices' },
      {
        'itunes:image': {
          _attr: {
            href: 'http://example.com/podcasts/everything/AllAboutEverything/Episode1.jpg'
          }
        }
      },
      { 'itunes:duration': '7:04' }
    ]
  });
}


module.exports = router;
