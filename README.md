# prpeek 👀
Show status of relevant pull requests live

## Usage 

Download executable from latest release [here](https://github.com/balfons/prpeek/releases).

**Example**
```bash
./prpeek --repo <owner>/<repository> --sound --interval 15 --labels bug,feature
```

**Options**
```bash
  -r, --repo <repo>          Repository to target: OWNER/REPO
  -i, --interval <interval>  Update interval in seconds (default: "10")
  -s, --sound                Sound when a new PR is added (default: false)
  -l, --labels <items>       Only show pull requests that needs review from you with any of the specified labels
  -h, --help                 display help for command
```


## Develop
**Install dependencies**

```bash
bun install
```

**To run**

```bash
bun start --repo <owner>/<repository>
```

**To compile**
```bash
bun compile
```

**Run compiled executable**
```bash
./prpeek --repo <owner>/<repository> --sound --interval 15 --labels bug,feature
```