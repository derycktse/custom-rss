const Router = require('koa-router')
const axios = require('axios')
const cheerio = require('cheerio');
const RSS = require('rss');
const router = new Router()

const DOUBAN_URL = 'https://www.douban.com/'

const instance = axios.create({
  baseURL: DOUBAN_URL,
  timeout: 60000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36',
    'Referer': 'https://www.douban.com/group/shenzhen/',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh-TW;q=0.7,zh;q=0.6',
    'Cookie': 'll="118282"; bid=7z57_X3aaME; _pk_ses.100001.8cb4=*; __utma=30149280.884327805.1524932197.1524932197.1524932197.1; __utmc=30149280; __utmz=30149280.1524932197.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); as="https://sec.douban.com/b?r=https%3A%2F%2Fwww.douban.com%2Fgroup%2Fshenzhen%2F"; ps=y; ck=2NOd; __utmt=1; push_noty_num=0; push_doumail_num=0; ap=1; _ga=GA1.2.884327805.1524932197; _gid=GA1.2.376286299.1524933837; __yadk_uid=Z5Bk9MmBmlmrE795aeWbRVC4UmRMHMzr; _pk_id.100001.8cb4=2fa688e9bded6cd0.1524932196.1.1524933864.1524932196.; __utmb=30149280.37.4.1524933864107'
  }
});


router.get('/douban/group/:groupname', async (ctx, next) => {
  let rawResultList = []

  // 获取第一页列表
  const resPage1 = await instance.get(`/group/${ctx.params.groupname}/discussion?start=0`, {
  })
  const $ = cheerio.load(resPage1.data)

  // 获取列表里的文章链接
  let targetUrlList = $('#content td.title a').map((idx, item) => {
    return item.attribs.href;
  })

  const resPage2 = await instance.get(`/group/${ctx.params.groupname}/discussion?start=25`, {
  })
  const $ = cheerio.load(resPage2.data)

  // 获取列表里的文章链接
  let targetUrlList2 = $('#content td.title a').map((idx, item) => {
    return item.attribs.href;
  })

  // 合并两页
  targetUrlList.push(...targetUrlList2)

  // 获取小组的标题
  const urlTitle = $('title').text().trim();

  const feedOptions = {}
  feedOptions.title = urlTitle;
  feedOptions.feedUrl = `${DOUBAN_URL}feed/group/${ctx.params.groupname}/discussion`;

  // 获取文章结果
  await fetchUrl(targetUrlList, 5, rawResultList)


  // 处理内容
  contentList = rawResultList.map(stripContent)
  // console.log(contentList)

  feedOptions.itemList = contentList || []

  // rss处理
  const feed = rssFactory(feedOptions)

  // ctx.body = res.data;
  var xml = feed.xml()
  ctx.body = xml
})



/**
 * 根据URL去获取文章的内容，
 * 支持写入同时并发的url数量
 */
async function fetchUrl(list, count, rawResultList) {
  const subList = list.splice(0, count);
  if (!subList.length) return

  const pmArr = subList.map((url) => {
    return instance.get(url)
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
    item.content = $('#link-report').html().replace(/<\/?[^>]+(>|$)/g, "").trim()
    item.author = $('.from a').text()
  }
  catch (e) {
    console.log('strip error')
  }
  return item
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
    language: 'zh-cn',
    // categories: ['Category 1', 'Category 2', 'Category 3'],
    pubDate: 'April 28, 2018 04:00:00 GMT',
    // ttl: '60',
    custom_namespaces: {
      'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'
    },
  });

  console.log(feedOptions)

  feedOptions.itemList.forEach(item => {
    feed.item({
      title: `${item.title}  from ${item.author}`,
      description: item.content,
      url: item.url, // link to the item
      // guid: '1123', // optional - defaults to url
      // categories: ['Category 1', 'Category 2', 'Category 3', 'Category 4'], // optional - array of item categories
      author: item.author, // optional - defaults to feed author property
      // date: 'May 27, 2012', // any format that js Date can parse.
      // lat: 33.417974, //optional latitude field for GeoRSS
      // long: -111.933231, //optional longitude field for GeoRSS
      // enclosure: { url: '...', file: 'path-to-file' }, // optional enclosure
      // custom_elements: [
      //   { 'itunes:author': 'John Doe' },
      //   { 'itunes:subtitle': 'A short primer on table spices' },
      //   {
      //     'itunes:image': {
      //       _attr: {
      //         href: 'http://example.com/podcasts/everything/AllAboutEverything/Episode1.jpg'
      //       }
      //     }
      //   },
      //   { 'itunes:duration': '7:04' }
      // ]
    });
  })

  return feed
}


module.exports = router;
