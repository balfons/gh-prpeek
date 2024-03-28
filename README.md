# prpeek 👀
Show status of relevant GitHub pull requests live

![Example screenshot](example.png)

## Installation
1. [Install GitHub CLI](https://github.com/cli/cli#installation) which prpeek depends on.
2. Install prpeek.
```bash
brew tap balfons/prpeek && brew install prpeek
```

Or download executable from latest release [here](https://github.com/balfons/prpeek/releases).

## Usage 

**Example**
```bash
prpeek --repos balfons/prpeek,oven-sh/bun --sound --interval 20 --labels bug,feature --involved
```

**Options**
```bash
  -r, --repos <repos>        Repositories to target: OWNER/REPO
  -i, --interval <interval>  Update interval in seconds (default: "15")
  -s, --sound                Sound when a new PR is added (default: false)
  --involved                 Show additional PRs where you are involved (default: false)
  -l, --labels <items>       Only show pull requests that needs review from you with any of the specified labels
  -h, --help                 display help for command
  -V, --version              output the version number
```


## Develop
**Install dependencies**

```bash
bun install
```

**To run**

```bash
bun start --repos <owner>/<repository>
```

**To compile**
```bash
bun compile
```

**Run compiled executable**
```bash
./prpeek --repos <owner>/<repository> --sound --interval 15 --labels bug,feature --involved
```