"""Reporting must never turn incomplete evidence into a release recommendation."""
import copy
from contextlib import chdir
import importlib.util
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch
from tempfile import TemporaryDirectory

spec = importlib.util.spec_from_file_location(
    'report', Path(__file__).resolve().parents[2] / 'scripts/automation-report.py')
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.head = 'a' * 40
        self.needs = {}
        for job, steps in report.REQUIRED.items():
            snapshot = {'tested_sha': self.head,
                        'preview_url': 'https://abc123.graphmaker-5k0.pages.dev',
                        'steps': {key: {'outcome': 'success'} for key in steps}}
            self.needs[job] = {'result': 'success', 'outputs': {'snapshot': json.dumps(snapshot)}}

    def test_complete_evidence_has_no_blockers(self):
        self.assertEqual(report.evaluate(self.needs, self.head)[1], [])

    def test_stale_artifact_checkout_is_blocked(self):
        self.assertIn('Artifact test code does not match workflow SHA',
                      report.evaluate(self.needs, self.head, 'b' * 40)[1])

    def test_cli_writes_reports_and_summary_for_success_and_failure(self):
        for outcome in ['success', 'failure']:
            with self.subTest(outcome=outcome), TemporaryDirectory() as temp, chdir(temp):
                event = {'pull_request': {'head': {'sha': self.head},
                                         'base': {'sha': 'b' * 40},
                                         'body': 'Closes #5', 'merged': False}}
                Path('event.json').write_text(json.dumps(event), encoding='utf-8')
                self.needs['verify']['result'] = outcome
                env = {'GITHUB_EVENT_PATH': 'event.json', 'GITHUB_SHA': self.head,
                       'NEEDS': json.dumps(self.needs), 'GITHUB_SERVER_URL': 'https://github.com',
                       'GITHUB_REPOSITORY': 'owner/repo', 'GITHUB_RUN_ID': '123',
                       'GITHUB_RUN_ATTEMPT': '2', 'GITHUB_STEP_SUMMARY': 'summary.md'}
                with patch.dict(os.environ, env), patch.object(report, 'git', return_value='docs/example.md'):
                    self.assertEqual(report.main(), int(outcome == 'failure'))
                data = json.loads(Path('verification-logs/automation-report.json').read_text(encoding='utf-8'))
                self.assertEqual(data['issue'], '#5')
                self.assertEqual(data['changed_files'], ['docs/example.md'])
                self.assertFalse(data['merged'])
                self.assertIn('Not deployed by this workflow', data['live_deployed'])
                self.assertEqual(data['recommendation'] == 'BLOCKED', outcome == 'failure')
                self.assertEqual(Path('summary.md').read_bytes(),
                                 Path('verification-logs/automation-report.md').read_bytes())

    def test_first_branch_push_uses_default_branch_merge_base(self):
        with TemporaryDirectory() as temp, chdir(temp):
            event = {'before': '0' * 40, 'repository': {'default_branch': 'main'}}
            Path('event.json').write_text(json.dumps(event), encoding='utf-8')
            env = {'GITHUB_EVENT_PATH': 'event.json', 'GITHUB_SHA': self.head,
                   'NEEDS': json.dumps(self.needs), 'GITHUB_SERVER_URL': 'https://github.com',
                   'GITHUB_REPOSITORY': 'owner/repo', 'GITHUB_RUN_ID': '123',
                   'GITHUB_RUN_ATTEMPT': '1', 'GITHUB_STEP_SUMMARY': 'summary.md'}
            with patch.dict(os.environ, env), patch.object(report, 'git', side_effect=['b' * 40, 'docs/example.md']) as git:
                self.assertEqual(report.main(), 0)
                git.assert_any_call('merge-base', 'origin/main', self.head)
            data = json.loads(Path('verification-logs/automation-report.json').read_text(encoding='utf-8'))
            self.assertEqual(data['base_sha'], 'b' * 40)
            self.assertEqual(data['changed_files'], ['docs/example.md'])

    def test_every_required_step_blocks_on_failure_skip_cancel_or_missing(self):
        for job, steps in report.REQUIRED.items():
            for step in steps:
                for outcome in ['failure', 'skipped', 'cancelled', 'missing']:
                    with self.subTest(job=job, step=step, outcome=outcome):
                        needs = copy.deepcopy(self.needs)
                        snapshot = json.loads(needs[job]['outputs']['snapshot'])
                        snapshot['steps'][step] = {'outcome': outcome}
                        needs[job]['outputs']['snapshot'] = json.dumps(snapshot)
                        self.assertTrue(report.evaluate(needs, self.head)[1])

    def test_skipped_job_and_absent_outputs_are_blocked(self):
        self.needs['verify-preview'] = {'result': 'skipped', 'outputs': {}}
        self.assertTrue(report.evaluate(self.needs, self.head)[1])

    def test_failed_job_blocks_even_with_successful_steps(self):
        self.needs['verify']['result'] = 'failure'
        self.assertIn('verify: failure', report.evaluate(self.needs, self.head)[1])

    def test_stale_preview_code_and_nonpreview_urls_are_blocked(self):
        for key, value in [('tested_sha', 'b' * 40), ('preview_url', ''),
                           ('preview_url', 'https://graphmaker.com'),
                           ('preview_url', 'https://abc.graphmaker-5k0.pages.dev/extra')]:
            with self.subTest(key=key, value=value):
                needs = copy.deepcopy(self.needs)
                snapshot = json.loads(needs['verify-preview']['outputs']['snapshot'])
                snapshot[key] = value
                needs['verify-preview']['outputs']['snapshot'] = json.dumps(snapshot)
                self.assertTrue(report.evaluate(needs, self.head)[1])


if __name__ == '__main__':
    unittest.main()
