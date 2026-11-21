/*!
 * 迷你 Markdown 渲染器 —— 只覆盖博客需要的语法，零依赖
 * 顺序：先整体 HTML 转义，再做内联替换，最后拼装块级结构。
 * 支持：标题、粗体/斜体/删除线、行内代码、代码块、列表、引用、表格、分隔线、链接、图片
 */
(function (global) {
  'use strict';

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
  }

  /** 只放行安全协议；相对路径保持原样 */
  function safeUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^(javascript|vbscript|file):/i.test(u)) return '';
    if (/^data:/i.test(u) && !/^data:image\/(png|jpe?g|gif|webp);/i.test(u)) return '';
    return u.replace(/"/g, '%22').replace(/'/g, '%27');
  }

  function inline(text) {
    const codes = [];
    let out = text.replace(/`([^`\n]+)`/g, (m, code) => {
      codes.push('<code>' + code + '</code>');
      return '\u0000' + (codes.length - 1) + '\u0000';
    });

    // 图片
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, alt, src, title) => {
      const url = safeUrl(src);
      if (!url) return alt;
      const t = title ? ' title="' + title + '"' : '';
      return '<img src="' + url + '" alt="' + alt + '"' + t + ' loading="lazy" decoding="async">';
    });

    // 链接
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, label, href, title) => {
      const url = safeUrl(href);
      if (!url) return label;
      const external = /^https?:\/\//i.test(url);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      const t = title ? ' title="' + title + '"' : '';
      return '<a href="' + url + '"' + attrs + t + '>' + label + '</a>';
    });

    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

    return out.replace(/\u0000(\d+)\u0000/g, (m, i) => codes[Number(i)]);
  }

  const BLOCK_START = /^(#{1,6}\s|```|>\s?|\s*([-*_])\s*\2\s*\2|\s*([-*+]|\d+\.)\s+|.*\|.*\|)/;

  function render(markdown) {
    const lines = escapeHtml(String(markdown || '').replace(/\r\n?/g, '\n')).split('\n');
    const html = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      // 代码块
      const fence = line.match(/^\s*```\s*([\w+#.-]*)\s*$/);
      if (fence) {
        const lang = fence[1];
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // 跳过收尾 ```
        const cls = lang ? ' class="language-' + lang + '"' : '';
        html.push('<pre><code' + cls + '>' + buf.join('\n') + '</code></pre>');
        continue;
      }

      // 标题
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        html.push('<h' + level + '>' + inline(heading[2].trim()) + '</h' + level + '>');
        i++;
        continue;
      }

      // 分隔线
      if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
        html.push('<hr>');
        i++;
        continue;
      }

      // 引用（可连续多行）
      if (/^\s*&gt;\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*&gt;\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*&gt;\s?/, ''));
          i++;
        }
        html.push('<blockquote>' + render(buf.join('\n')) + '</blockquote>');
        continue;
      }

      // 表格：本行含 |，下一行是分隔行
      if (i + 1 < lines.length && line.includes('|') &&
          /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        const splitRow = (row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
        const head = splitRow(line);
        const aligns = splitRow(lines[i + 1]).map((c) => {
          if (/^:.*:$/.test(c)) return 'center';
          if (/:$/.test(c)) return 'right';
          return 'left';
        });
        i += 2;
        const body = [];
        while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
          body.push(splitRow(lines[i]));
          i++;
        }
        const style = (idx) => (aligns[idx] && aligns[idx] !== 'left' ? ' style="text-align:' + aligns[idx] + '"' : '');
        html.push(
          '<table><thead><tr>' +
          head.map((cell, idx) => '<th' + style(idx) + '>' + inline(cell) + '</th>').join('') +
          '</tr></thead><tbody>' +
          body.map((cells) => '<tr>' + head.map((_, idx) => '<td' + style(idx) + '>' + inline(cells[idx] || '') + '</td>').join('') + '</tr>').join('') +
          '</tbody></table>'
        );
        continue;
      }

      // 列表
      const listMatch = line.match(/^\s*([-*+]|\d+\.)\s+/);
      if (listMatch) {
        const ordered = /\d/.test(listMatch[1]);
        const items = [];
        while (i < lines.length) {
          const m = lines[i].match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
          if (!m || /\d/.test(m[1]) !== ordered) break;
          items.push(m[2]);
          i++;
          // 懒延续行
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
            items[items.length - 1] += ' ' + lines[i].trim();
            i++;
          }
        }
        const tag = ordered ? 'ol' : 'ul';
        html.push('<' + tag + '>' + items.map((it) => '<li>' + inline(it) + '</li>').join('') + '</' + tag + '>');
        continue;
      }

      // 段落（遇到空行或新的块级元素结束）
      const buf = [line];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !BLOCK_START.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      html.push('<p>' + buf.map((l) => inline(l.trim())).join('<br>') + '</p>');
    }

    return html.join('\n');
  }

  global.HDMD = { render: render, escapeHtml: escapeHtml, safeUrl: safeUrl };
})(window);
