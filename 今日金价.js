import fetch from 'node-fetch'

export class GoldPrice extends plugin {
  constructor() {
    super({
      name: '今日金价',
      dsc: '查询今日金价信息',
      event: 'message',
      priority: 10,
      rule: [{
        reg: /^#?(今日)?金价$/i,
        fnc: 'queryGoldPrice'
      }]
    })
  }

  async queryGoldPrice() {
    try {
      let data = await (await fetch('https://v2.xxapi.cn/api/goldprice')).json()
      if (data.code !== 200 || !data.data) return this.reply('查询失败')

      let msg = [], d = data.data
      let date = d.gold_recycle_price?.[0]?.updated_date || ''

      msg.push({ user_id: this.e.bot.uin, nickname: '今日金价', message: '🏆 今日金价查询结果' })

      msg.push({ user_id: this.e.bot.uin, nickname: '银行金条', message: '📊 银行投资金条价格' })
      d.bank_gold_bar_price.forEach(i => msg.push({ user_id: this.e.bot.uin, nickname: '银行金条', message: `${i.bank}: ${i.price}元/克` }))

      msg.push({ user_id: this.e.bot.uin, nickname: '黄金回收', message: '♻️ 黄金回收价格' })
      d.gold_recycle_price.forEach(i => msg.push({ user_id: this.e.bot.uin, nickname: '黄金回收', message: `${i.gold_type}: ${i.recycle_price}元/克` }))

      msg.push({ user_id: this.e.bot.uin, nickname: '品牌金价', message: '💎 品牌珠宝金价' })
      d.precious_metal_price.forEach(i => {
        let l = []
        if (i.bullion_price !== '-') l.push(`投资金条: ${i.bullion_price}元/克`)
        if (i.gold_price !== '-') l.push(`黄金: ${i.gold_price}元/克`)
        if (i.platinum_price !== '-') l.push(`铂金: ${i.platinum_price}元/克`)
        msg.push({ user_id: this.e.bot.uin, nickname: '品牌金价', message: `${i.brand}\n${l.join('\n')}` })
      })

      if (date) msg.push({ user_id: this.e.bot.uin, nickname: '更新时间', message: `📅 数据更新时间: ${date}` })

      let ngm = this.e.isGroup ? await this.e.group.makeForwardMsg(msg) : await this.e.friend.makeForwardMsg(msg)
      if (ngm.data?.meta?.detail) ngm.data.meta.detail = { news: [{ text: '今日金价查询结果' }], source: '今日金价查询', summary: '今日金价', preview: '' }
      if (ngm.data?.prompt) ngm.data.prompt = '今日金价查询结果'

      await this.reply(ngm)
    } catch {
      await this.reply('查询失败，请稍后再试')
    }
  }
}