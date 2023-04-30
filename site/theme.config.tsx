import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'
import { useRouter } from "next/router";

const config: DocsThemeConfig = {
  logo: <span>Minditor</span>,
  project: {
    link: 'https://github.com/shuding/nextra-docs-template',
  },
  chat: {
    link: 'https://discord.com',
  },
  docsRepositoryBase: 'https://github.com/shuding/nextra-docs-template',
  footer: {
    text: 'Minditor',
  },
  i18n: [
    { locale: 'en', text: 'English' },
    { locale: 'zh', text: '中文' },
  ],
  useNextSeoProps() {
    const { asPath } = useRouter()
    if (asPath !== '/') {
      return {
        titleTemplate: '%s – Minditor'
      }
    }
  },
  sidebar: {
    defaultMenuCollapseLevel:2,
  },
  toc: {}
}

export default config
