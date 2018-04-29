const Router = require('koa-router')
const axios = require('axios')
const cheerio = require('cheerio');
const RSS = require('rss');
const router = new Router()
const prettifyXml = require('prettify-xml')

const DOUBAN_URL = 'https://www.douban.com/'

const instance = axios.create({
  baseURL: DOUBAN_URL,
  timeout: 300000,
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh-TW;q=0.7,zh;q=0.6',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Cookie': 'as="https://sec.douban.com/b?r=https%3A%2F%2Fwww.douban.com%2Fgroup%2Fshenzhen%2F"; bid=em1YZSE1l78; ps=y; ll="118282"; _pk_ses.100001.8cb4=*; __utma=30149280.2013164407.1524973381.1524973381.1524973381.1; __utmc=30149280; __utmz=30149280.1524973381.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utmt=1; dbcl2="150682313:JAY4LTIvDP0"; ck=7vu4; push_noty_num=0; push_doumail_num=0; __yadk_uid=2G6jLJfJrREgWZtWjqFjMwR8dsAJzUpr; _pk_id.100001.8cb4=5a6987c1ab761b91.1524973380.1.1524973570.1524973380.; __utmb=30149280.31.0.1524973570253',
    'Host': 'www.douban.com',
    'Referer': 'https://www.douban.com/group/shenzhen/',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36',
  }
});


router.get('/douban/group/:groupname', async (ctx, next) => {
  let rawResultList = []

  // 获取第一页列表
  const resPage1 = await instance.get(`/group/${ctx.params.groupname}/discussion?start=0`, {
  })
  console.log('获取第一页成功')
  const $ = cheerio.load(resPage1.data)

  // 获取列表里的文章链接
  let targetUrlList = $('#content td.title a').map((idx, item) => {
    return item.attribs.href;
  })

  const resPage2 = await instance.get(`/group/${ctx.params.groupname}/discussion?start=25`, {
  })

  console.log('获取第二页成功')
  const $2 = cheerio.load(resPage2.data)

  // 获取列表里的文章链接
  let targetUrlList2 = $2('#content td.title a').map((idx, item) => {
    return item.attribs.href;
  })

  // 合并两页, 数据，注： 结果是指一个类数组对象，所以要将它们转换成数组先
  targetUrlList = Array.prototype.slice.call(targetUrlList2).concat(Array.prototype.slice.call(targetUrlList2))

  //test code
  // targetUrlList = [targetUrlList[0], targetUrlList[1], targetUrlList[2]]
  
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
  // ctx.body = xml
  ctx.body = prettifyXml(injectRss(xml), { indent: 2, newline: '\n' })
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
    item.content = $('.topic-content.clearfix').html() //.replace(/<\/?[^>]+(>|$)/g, "").trim()
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


// rss injecter 嵌入css样式
function injectRss(xml) {
  // return xml
  const styleString = `<?xml-stylesheet type="text/css" href="https://img3.doubanio.com/f/shire/bf61b1fa02f564a4a8f809da7c7179b883a56146/css/douban.css" ?>
   <?xml-stylesheet type="text/css" href="https://img3.doubanio.com/misc/mixed_static/5a5aaf5c9acac09c.css" ?>
   <?xml-stylesheet type="text/css" href="https://img3.doubanio.com/f/group/2f4c6f83940e2bbb76f5a23a7d987b9093919799/css/group/init.css" ?>`
  const target = '<?xml version="1.0" encoding="UTF-8"?>'

  return xml.replace(target, target + styleString);
}

module.exports = router;
