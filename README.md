# haidi.fun

涓汉鎶€鏈崥瀹笌浣滃搧闆嗭細12 涓」鐩€?2 绡囨枃绔狅紝鎸夈€屽熀纭€ 鈫?杩涢樁 鈫?缁煎悎 鈫?鐮旂┒銆嶇粍缁囥€?

## 鎶€鏈爤

- 鍓嶅彴锛欻TML + CSS + 鍘熺敓 JavaScript锛屾棤妗嗘灦銆佹棤 jQuery
- 鍐呭锛欽SON 椹卞姩锛岄」鐩笌鏂囩珷鐢辨湰鍦?Python 鍚庡彴鐢熸垚
- 閮ㄧ讲锛欼IS锛坄web.config`锛夋垨 Nginx锛岀函闈欐€?

## 椤甸潰

| 璺敱 | 鍐呭 |
| --- | --- |
| `#/works` | 12 涓」鐩紝鍙寜瀛︿範闃舵绛涢€?|
| `#/works/<id>` | 椤圭洰璇︽儏锛氭寚鏍囥€佸疄鐜般€佺粨鏋滄埅鍥撅紙鐏鏀惧ぇ锛?|
| `#/blog` | 鎶€鏈枃绔狅細鏍囩銆佸眰绾с€佹悳绱?|
| `#/blog/<id>` | 鏂囩珷璇︽儏 |

## 鏈湴棰勮

```bash
python -m http.server 8100
# 鎵撳紑 http://127.0.0.1:8100/
```

> 鐩存帴鍙屽嚮 `index.html` 鏃讹紝娴忚鍣ㄤ細闃绘 `fetch('data/content.json')`锛岃鐢ㄦ湰鍦版湇鍔″櫒銆?

## 閮ㄧ讲

### IIS

鎶婃湰浠撳簱鍐呭鏀惧埌绔欑偣鏍圭洰褰曪紝`web.config` 宸插寘鍚細

- `.webp / .json / .woff2` 鐨?MIME
- 404 椤甸潰銆佺紦瀛樼瓥鐣ャ€佸畨鍏ㄥご
- 灞忚斀 `.git` 绛夌洰褰?

### Nginx

```nginx
root /var/www/haidi;
index index.html;
location / { try_files $uri $uri/ =404; }
location ~* \.(css|js)$ { expires 7d; }
location ~* \.(webp|png|jpg|ico|svg)$ { expires 30d; }
location = /data/content.json { add_header Cache-Control "no-cache"; }
```

## 璇存槑

- 椤圭洰缁撴灉鍥炬潵鑷湰鍦板疄闄呰繍琛岋紝鎸囨爣鍐欏湪椤圭洰椤甸噷锛?
- 鏂囩珷鎸夐毦搴﹀垎涓哄熀纭€銆佽繘闃躲€佺患鍚堛€佺爺绌跺洓灞傦紱
- 鍐呭鍚庡彴锛圥ython 鏍囧噯搴撳疄鐜帮級涓嶅湪鏈粨搴擄紝绔欑偣鍙緷璧栭潤鎬佹枃浠躲€?
