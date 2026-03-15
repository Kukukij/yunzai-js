import fetch from 'node-fetch'

export class WhoisQuery extends plugin {
  constructor() {
    super({
      name: 'WHOIS查询',
      dsc: '查询域名WHOIS信息',
      event: 'message',
      priority: 10,
      rule: [{
        reg: /^#?(whois|域名信息)查询\s?.+$/i,
        fnc: 'queryWhois'
      }]
    })
  }

  async queryWhois() {
    let input = this.e.msg.replace(/^#?(whois|域名信息)查询\s?/i, '').trim()
    if (!input) return this.reply('请输入要查询的域名')

    try {
      let data = await (await fetch(`https://v2.xxapi.cn/api/whois?domain=${encodeURIComponent(input)}`)).json()
      if (data.code !== 200 || !data.data) return this.reply('查询失败')

      let msg = [{
        user_id: this.e.bot.uin,
        nickname: 'WHOIS查询结果',
        message: `域名: ${input}`
      }]

      let fields = ['注册人','注册人邮箱','注册商','注册商URL','注册时间','过期时间','域名状态','DNS服务器']
      let keys = ['Registrant','Registrant Contact Email','Sponsoring Registrar','Registrar URL','Registration Time','Expiration Time','domain_status','DNS Serve']

      fields.forEach((f, i) => {
        let v = data.data[keys[i]] || data.data.data?.[keys[i].toLowerCase()] || '未公开'
        if (Array.isArray(v)) v = v.join('\n')
        msg.push({ user_id: this.e.bot.uin, nickname: 'WHOIS查询结果', message: `${f}: ${v}` })
      })

      let ngm = this.e.isGroup ? 
        await this.e.group.makeForwardMsg(msg) : 
        await this.e.friend.makeForwardMsg(msg)

      if (ngm.data?.meta?.detail) ngm.data.meta.detail = {
        news: [{ text: 'WHOIS查询结果' }],
        source: 'WHOIS查询',
        summary: 'WHOIS查询',
        preview: ''
      }
      
      if (ngm.data?.prompt) ngm.data.prompt = 'WHOIS查询结果'

      await this.reply(ngm)
    } catch {
      await this.reply('查询出错，请稍后再试')
    }
  }
}