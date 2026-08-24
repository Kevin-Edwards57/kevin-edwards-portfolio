# Updating the portfolio when a project launches

No CMS, no backend, no cross repository automation. One script and one deploy.

## Why there is no automatic trigger

Connecting Otonia, GuardLink or WedLink to auto update this site would need a
GitHub token with write access stored as a secret in each of those repositories.
That is real credential surface for a page that changes a handful of times a
year, and a green build is not evidence of a public launch. A tagged release
means the code shipped, not that Apple approved it.

So the trigger is you saying so.

## Marking a project live

    scripts/launch.py otonia --status "Live" --url "https://apps.apple.com/..." --label "App Store"
    scripts/launch.py guardlink --status "Live" --url "https://guardlink.example" --label "Visit"
    scripts/launch.py wedlink --status "Live" --url "https://play.google.com/..." --label "Google Play"

Status can be anything: "Live", "In store review", "Beta". Colour comes from
`--kind`: `live` green, `dev` blue, `int` purple, `pro` amber.

The script refuses to write if an em dash appears, and refuses to reference a
screenshot that is not already on disk.

## Adding launch screenshots

1. Drop the images into `assets/shots/` using the existing naming, for example
   `otonia-launch-1.jpg`. Compress first:

       sips -Z 760 source.png --out assets/shots/otonia-launch-1.jpg -s format jpeg -s formatOptions 82

2. Pass them with `--shots` so the script checks they exist.
3. Wire them into that project's gallery, or ask Claude to.

## Deploying

    netlify deploy --prod --dir=.

Takes a few seconds. Or push to GitHub once continuous deployment is connected.

## Switching to the real domain

Once kevinedwards.dev is registered and pointed at Netlify:

    scripts/set-domain.sh kevinedwards.dev
    netlify deploy --prod --dir=.

That rewrites the canonical link and the social metadata in one pass.

## The rule that matters

Do not mark a project live because the code works, the build passed, or a tag
was cut. Mark it live when a member of the public can install or visit it.
