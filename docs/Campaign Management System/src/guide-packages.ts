type Package = { loaded: number; empty: number }
type Annotation = { packages: Package[]; providers?: {providerId:string;packages:Package[]}[] }
/** Null means there is no reliable supplier breakdown; never assign global crates to one supplier. */
export function guidePackageCount(annotation:Annotation|undefined, ids:string[], allProviderIds:string[], advances:{providerId?:string;crates:number}[]=[]):number|null {
 if(!ids.length)return 0
 const sum=(items:Package[])=>items.reduce((n,p)=>n+p.loaded,0)
 if(annotation?.providers?.length&&ids.every(id=>annotation.providers!.some(p=>p.providerId===id)))return sum(annotation.providers.filter(p=>ids.includes(p.providerId)).flatMap(p=>p.packages))
 if(annotation&&allProviderIds.length>0&&ids.length===allProviderIds.length&&allProviderIds.every(id=>ids.includes(id)))return sum(annotation.packages)
 if(ids.every(id=>advances.some(a=>a.providerId===id)))return advances.filter(a=>ids.includes(a.providerId||'')).reduce((n,a)=>n+a.crates,0)
 return null
}
