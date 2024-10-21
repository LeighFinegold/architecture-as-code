"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[432],{2373:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>s,default:()=>h,frontMatter:()=>r,metadata:()=>o,toc:()=>l});var i=n(4848),a=n(8453);const r={id:"generate",title:"Generate",sidebar_position:4},s="Generate",o={id:"working-with-calm/generate",title:"Generate",description:"The generate command allows you to create an instantiation of an architecture from a predefined CALM pattern. This command helps you quickly set up the structure of your architecture using reusable patterns, which can then be customized to fit your specific needs.",source:"@site/docs/working-with-calm/generate.md",sourceDirName:"working-with-calm",slug:"/working-with-calm/generate",permalink:"/working-with-calm/generate",draft:!1,unlisted:!1,tags:[],version:"current",sidebarPosition:4,frontMatter:{id:"generate",title:"Generate",sidebar_position:4},sidebar:"docsSidebar",previous:{title:"Using the CLI",permalink:"/working-with-calm/using-the-cli"},next:{title:"Validate",permalink:"/working-with-calm/validate"}},c={},l=[{value:"Basic Usage",id:"basic-usage",level:2},{value:"Command Options",id:"command-options",level:2},{value:"Example of Generating an Instantiation",id:"example-of-generating-an-instantiation",level:2}];function d(e){const t={code:"code",h1:"h1",h2:"h2",header:"header",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,a.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.header,{children:(0,i.jsx)(t.h1,{id:"generate",children:"Generate"})}),"\n",(0,i.jsxs)(t.p,{children:["The ",(0,i.jsx)(t.code,{children:"generate"})," command allows you to create an instantiation of an architecture from a predefined CALM pattern. This command helps you quickly set up the structure of your architecture using reusable patterns, which can then be customized to fit your specific needs."]}),"\n",(0,i.jsx)(t.h2,{id:"basic-usage",children:"Basic Usage"}),"\n",(0,i.jsxs)(t.p,{children:["To generate an instantiation, you will need a pattern file that defines the architecture template. You can use the ",(0,i.jsx)(t.code,{children:"generate"})," command with the ",(0,i.jsx)(t.code,{children:"--pattern"})," option to specify the path to the pattern file:"]}),"\n",(0,i.jsx)(t.pre,{children:(0,i.jsx)(t.code,{className:"language-shell",children:"calm generate -p calm/pattern/api-gateway.json\n"})}),"\n",(0,i.jsxs)(t.p,{children:["This will create an instantiation in the current working directory with the default filename ",(0,i.jsx)(t.code,{children:"instantiation.json"}),"."]}),"\n",(0,i.jsx)(t.h2,{id:"command-options",children:"Command Options"}),"\n",(0,i.jsxs)(t.ul,{children:["\n",(0,i.jsxs)(t.li,{children:[(0,i.jsx)(t.strong,{children:(0,i.jsx)(t.code,{children:"-p, --pattern <source>"})}),": Path to the pattern file to use. This can be a file path or a URL."]}),"\n",(0,i.jsxs)(t.li,{children:[(0,i.jsx)(t.strong,{children:(0,i.jsx)(t.code,{children:"-o, --output <output>"})}),": Path to the location where the generated file will be saved (default is ",(0,i.jsx)(t.code,{children:"instantiation.json"}),")."]}),"\n",(0,i.jsxs)(t.li,{children:[(0,i.jsx)(t.strong,{children:(0,i.jsx)(t.code,{children:"-s, --schemaDirectory <path>"})}),": Path to the directory containing schemas to use in instantiation."]}),"\n",(0,i.jsxs)(t.li,{children:[(0,i.jsx)(t.strong,{children:(0,i.jsx)(t.code,{children:"-a, --instantiateAll"})}),': Instantiate all properties, ignoring the "required" field (default: false).']}),"\n"]}),"\n",(0,i.jsx)(t.h2,{id:"example-of-generating-an-instantiation",children:"Example of Generating an Instantiation"}),"\n",(0,i.jsx)(t.p,{children:"Here is an example command that generates an instantiation from a CALM pattern file and saves it with a custom filename:"}),"\n",(0,i.jsx)(t.pre,{children:(0,i.jsx)(t.code,{className:"language-shell",children:"calm generate -p calm/pattern/microservices.json -o my-architecture.json\n"})}),"\n",(0,i.jsxs)(t.p,{children:["This command uses the ",(0,i.jsx)(t.code,{children:"microservices.json"})," pattern and outputs the result to ",(0,i.jsx)(t.code,{children:"my-architecture.json"}),"."]})]})}function h(e={}){const{wrapper:t}={...(0,a.R)(),...e.components};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(d,{...e})}):d(e)}},8453:(e,t,n)=>{n.d(t,{R:()=>s,x:()=>o});var i=n(6540);const a={},r=i.createContext(a);function s(e){const t=i.useContext(r);return i.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function o(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(a):e.components||a:s(e.components),i.createElement(r.Provider,{value:t},e.children)}}}]);