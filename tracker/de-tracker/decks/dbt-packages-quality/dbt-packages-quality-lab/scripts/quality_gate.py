"""quality_gate.py: every check of the lab, in order. Exit code 0 only if all pass.
Run from the project folder with the virtual environment active:  python scripts/quality_gate.py"""
import os
import subprocess
import sys

STEPS = [
    ("install packages (lock file)", ["dbt", "deps"]),
    ("load raw data", [sys.executable, "scripts/load_raw.py"]),
    ("build and test the project", ["dbt", "build", "--exclude", "package:dbt_project_evaluator"]),
    ("project evaluator, severity error", ["dbt", "build", "--select",
                                           "package:dbt_project_evaluator", "dbt_project_evaluator_exceptions"]),
    ("SQLFluff lint (dbt style config)", [sys.executable, "-m", "sqlfluff", "lint", "models", "tests"]),
]


def main():
    env = dict(os.environ, DBT_PROJECT_EVALUATOR_SEVERITY="error", DBT_PROFILES_DIR=os.getcwd())
    for name, cmd in STEPS:
        p = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print(f"{'PASS' if p.returncode == 0 else 'FAIL'}  {name}")
        if p.returncode != 0:
            print((p.stdout + p.stderr)[-3000:])
            print("QUALITY GATE: FAIL")
            return 1                       # later steps depend on earlier ones
    print("QUALITY GATE: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
