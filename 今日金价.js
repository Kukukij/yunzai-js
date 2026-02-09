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
      const res = await fetch('https://v2.xxapi.cn/api/goldprice')
      const data = await res.json()

      if (data.code !== 200 || !data.data) return this.reply('查询失败')

      const forwardMsg = []
      const updateDate = data.data.gold_recycle_price?.[0]?.updated_date || ''

      forwardMsg.push({
        user_id: this.e.bot.uin,
        nickname: '今日金价',
        message: '🏆 今日金价查询结果'
      })

      forwardMsg.push({
        user_id: this.e.bot.uin,
        nickname: '银行金条',
        message: '📊 银行投资金条价格'
      })

      data.data.bank_gold_bar_price.forEach(item => {
        forwardMsg.push({
          user_id: this.e.bot.uin,
          nickname: '银行金条',
          message: `${item.bank}: ${item.price}元/克`
        })
      })

      forwardMsg.push({
        user_id: this.e.bot.uin,
        nickname: '黄金回收',
        message: '♻️ 黄金回收价格'
      })

      data.data.gold_recycle_price.forEach(item => {
        forwardMsg.push({
          user_id: this.e.bot.uin,
          nickname: '黄金回收',
          message: `${item.gold_type}: ${item.recycle_price}元/克`
        })
      })

      forwardMsg.push({
        user_id: this.e.bot.uin,
        nickname: '品牌金价',
        message: '💎 品牌珠宝金价'
      })

      data.data.precious_metal_price.forEach(item => {
        const lines = []
        if (item.bullion_price !== '-') lines.push(`投资金条: ${item.bullion_price}元/克`)
        if (item.gold_price !== '-') lines.push(`黄金: ${item.gold_price}元/克`)
        if (item.platinum_price !== '-') lines.push(`铂金: ${item.platinum_price}元/克`)
        
        forwardMsg.push({
          user_id: this.e.bot.uin,
          nickname: '品牌金价',
          message: `${item.brand}\n${lines.join('\n')}`
        })
      })

      if (updateDate) {
        forwardMsg.push({
          user_id: this.e.bot.uin,
          nickname: '更新时间',
          message: `📅 数据更新时间: ${updateDate}`
        })
      }

      let ngm = this.e.isGroup ? 
        await this.e.group.makeForwardMsg(forwardMsg) : 
        await this.e.friend.makeForwardMsg(forwardMsg)

      if (ngm.data?.meta?.detail) {
        ngm.data.meta.detail = {
          news: [{ text: '今日金价查询结果' }],
          source: '今日金价查询',
          summary: '今日金价',
          preview: ''
        }
      }
      
      if (ngm.data?.prompt) ngm.data.prompt = '今日金价查询结果'

      await this.reply(ngm)

    } catch {
      await this.reply('查询失败，请稍后再试')
    }
  }
}