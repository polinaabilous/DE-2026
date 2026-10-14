# <verb> <what changed> <why, if it fits in 72 characters>

<!-- Copy into .github/pull_request_template.md to make it the default for a repository.
     python doclint.py pr pr-<name>.md -->

## What and why
<the change in two or three sentences, and the reason; link the intake, design doc or ADR>

## How it was validated
<commands you ran, tests added, numbers you compared, before and after>

## Impact on existing models and consumers
<changed columns, grain or numbers; who is affected; "None" if nothing changes>

## Rollback
<how to undo it safely>

## Checklist
- [ ] Tests added or updated, and passing
- [ ] Descriptions and docs updated
- [ ] Downstream owners told (when impact is not "None")
