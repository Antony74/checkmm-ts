// Metamath database verifier
// Eric Schmidt (eric41293@comcast.net)
//
// I release this code to the public domain under the
// Creative Commons "CC0 1.0 Universal" Public Domain Dedication:
//
// http://creativecommons.org/publicdomain/zero/1.0/
//
// This is a standalone verifier for Metamath database files,
// written in portable C++. Run it with a single file name as the
// parameter.
//
// Some notes:
//
// The code assumes that the character set is compatible with ASCII.
//
// According to the spec, file inclusion commands should not include a file
// that has already been included. Unfortunately, determing whether two
// different strings refer to the same file is not easy, and, worse, is
// system-dependant. This program ignores the issue entirely and assumes
// that distinct strings name different files. This should be adequate for
// the present, at least.
//
// If the verifier finds an error, it will report it and quit. It will not
// attempt to recover and find more errors. The only condition that generates
// a diagnostic message but doesn't halt the program is an incomplete proof,
// specified by a question mark. In that case, as per the spec, a warning is
// issued and checking continues.
//
// Please let me know of any bugs.

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <deque>
#include <fstream>
#include <iostream>
#include <iterator>
#include <limits>
#include <map>
#include <queue>
#include <set>
#include <string>
#include <utility>
#include <vector>

std::queue<std::string> tokens;

std::set<std::string> constants;

typedef std::vector<std::string> Expression;

// The first parameter is the statement of the hypothesis, the second is
// true iff the hypothesis is floating.
typedef std::pair<Expression, bool> Hypothesis;

std::map<std::string, Hypothesis> hypotheses;

std::set<std::string> variables;

// An axiom or a theorem.
struct Assertion {
  // Hypotheses of this axiom or theorem.
  std::deque<std::string> hypotheses;
  std::set<std::pair<std::string, std::string>> disjvars;
  // Statement of axiom or theorem.
  Expression expression;
};

std::map<std::string, Assertion> assertions;

struct Scope {
  std::set<std::string> activevariables;
  // Labels of active hypotheses
  std::vector<std::string> activehyp;
  std::vector<std::set<std::string>> disjvars;
  // Map from variable to label of active floating hypothesis
  std::map<std::string, std::string> floatinghyp;
};

// Determine if a string is used as a label
// const labelused = (label: string): boolean => {
//     return hypotheses.get(label) !== undefined || assertions.get(label) !=
//     undefined;
// };
