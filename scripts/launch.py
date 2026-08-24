#!/usr/bin/env python3
"""Mark a portfolio project as launched.

This is deliberately manual. Nothing here watches a repository, and no build
or commit can trigger it. You run it when a project is actually public.

  scripts/launch.py otonia --url "https://apps.apple.com/..." --label "App Store"
  scripts/launch.py guardlink --url "https://guardlink.example" --label "Live site"
  scripts/launch.py wedlink  --status "In store review"

Add screenshots first by dropping files into assets/shots/, then pass them:
  --shots otonia-new1.jpg otonia-new2.jpg
"""
import argparse, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"

# Project name as it appears in the <h3> of its card or case study.
PROJECTS = {
    "winston": "Winston", "builder": "YardLink Studio Website Builder",
    "eats": "YardLink Eats", "guardlink": "GuardLink", "anansi": "Anansi",
    "avenuerun": "Avenue Run", "otonia": "Otonia", "susan": "Susan",
    "wedlink": "WedLink", "vt2nh": "VT2NH", "pulse": "YardLink Pulse",
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project", choices=sorted(PROJECTS))
    ap.add_argument("--status", default="Live", help='pill text, e.g. "Live" or "In store review"')
    ap.add_argument("--kind", default="live", choices=["live","dev","int","pro"], help="pill colour")
    ap.add_argument("--url", help="public link, for example an App Store URL")
    ap.add_argument("--label", default="View", help="link text next to the project title")
    ap.add_argument("--shots", nargs="*", default=[], help="filenames already placed in assets/shots/")
    a = ap.parse_args()

    name = PROJECTS[a.project]
    s = HTML.read_text()
    anchor = f">{name}</h3>"
    if anchor not in s:
        sys.exit(f"could not find {name} in index.html")
    i = s.index(anchor)

    # Replace the status pill that follows this project's heading.
    tail = s[i:]
    m = re.search(r'<span class="pill (live|dev|int|pro)">([^<]*)</span>', tail)
    if not m:
        sys.exit(f"no status pill found after {name}")
    old = m.group(0)
    new = f'<span class="pill {a.kind}">{a.status}</span>'
    s = s[:i] + tail.replace(old, new, 1)
    print(f"status: {m.group(2).strip()}  ->  {a.status}")

    # Add a public link right after the pill, if one was given.
    if a.url:
        link = (f'<a class="btn btn-s" style="padding:8px 16px;font-size:.82rem;margin-left:10px" '
                f'href="{a.url}" target="_blank" rel="noopener">{a.label} ↗</a>')
        s = s.replace(new, new + link, 1)
        print(f"link:   {a.label} -> {a.url}")

    # Verify any new screenshots actually exist before referencing them.
    for f in a.shots:
        p = ROOT / "assets" / "shots" / f
        if not p.is_file():
            sys.exit(f"missing asset: {p}")
    if a.shots:
        print("screenshots present:", ", ".join(a.shots))
        print("place them in the project gallery by hand, or ask Claude to wire them in.")

    if "\u2014" in s:
        sys.exit("refusing to write: an em dash appeared")
    HTML.write_text(s)
    print("\nindex.html updated. Review it, then deploy:")
    print("  netlify deploy --prod --dir=.")

if __name__ == "__main__":
    main()
