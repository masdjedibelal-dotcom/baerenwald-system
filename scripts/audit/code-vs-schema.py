"""Findet Supabase-Abfragen im Code (CRM + Portal), deren Tabelle/Spalte im Ziel-Schema fehlt.
Erst: TARGET=prod node scripts/audit/schema-snapshot.mjs · Dann: TARGET=prod python3 scripts/audit/code-vs-schema.py"""
import os,re,json
S=os.path.join(os.path.dirname(os.path.abspath(__file__)),"out")
sc=json.load(open(os.path.join(S,"schema-%s.json"%(os.environ.get("TARGET","prod")))))
T=set(sc["tables"]);C={}
for tc in sc["cols"]:
    t,c=tc.split(".",1); C.setdefault(t,set()).add(c)
def strip_nested(s):
    out=[];depth=0;cur=""
    for ch in s:
        if ch=="(": depth+=1; continue
        if ch==")": depth-=1; continue
        if depth==0: cur+=ch
    return cur
res=[]
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),"../../.."))
for repo in [os.path.join(ROOT,"baerenwald-system"),os.path.join(ROOT,"baerenwald")]:
    for d,_,fs in os.walk(repo+"/src"):
        if "node_modules" in d: continue
        for f in fs:
            if not f.endswith((".ts",".tsx")): continue
            p=os.path.join(d,f); t=open(p,encoding="utf8",errors="ignore").read()
            for m in re.finditer(r"""\.from\(\s*['"`]([a-z_][a-z0-9_]*)['"`]\s*\)\s*\.(?:select|insert|update|upsert)\(""",t):
                name=m.group(1)
                if "storage" in t[max(0,m.start()-12):m.start()] or name not in T: continue
                verb=t[m.end()-7:m.end()-1]
                seg=t[m.end():m.end()+1500]
                if "select(" in t[m.start():m.end()]:
                    mm=re.match(r"""\s*['"`]([^'"`]*)['"`]""",seg)
                    if not mm: continue
                    base=strip_nested(mm.group(1))
                    cols=[]
                    for c in base.split(","):
                        c=c.strip()
                        if not c or c=="*" : continue
                        if ":" in c: c=c.split(":")[1].strip()
                        c=c.split("->")[0].split("::")[0].strip().lstrip("!")
                        if re.fullmatch(r"[a-z_][a-z0-9_]*",c) and "!" not in c: cols.append(c)
                    # nested relation names like 'kunden' remain -> ignore if a table
                    bad=[c for c in cols if c not in C[name] and c not in T]
                else:
                    mm=re.match(r"""\s*\{([^{}]{0,1200})\}""",seg)
                    if not mm: continue
                    keys=re.findall(r"(?:^|,|\n)\s*([a-z_][a-z0-9_]*)\s*:",mm.group(1))
                    bad=[k for k in keys if k not in C[name]]
                if bad:
                    line=t[:m.start()].count("\n")+1
                    res.append((os.path.basename(repo),os.path.relpath(p,repo)+":"+str(line),name,sorted(set(bad))))
for r in res: print(r[0],r[1],r[2],r[3])
print(len(res))
