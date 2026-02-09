import traceback
from graph.graph_utils import app, BASE_VERDICT_PROMPT, SignalFramingOutput, RealityCheckOutput, VerdictOutput
from langchain_core.output_parsers import JsonOutputParser

topic = "AutoGPT autonomous agents"
user = "AI/ML engineer, building LLM applications"

print('Running debug invoke for topic:', topic)

try:
    result = app.invoke({"topic": topic, "user_profile": user})
    print('Invoke succeeded!')
    print('Verdict:', result.get('verdict'))
    print('\nDecision Ledger:')
    import json
    ledger = result.get('ledger')
    if ledger:
        print(json.dumps(ledger.dict() if hasattr(ledger, 'dict') else ledger, indent=2))
    else:
        print('No ledger found in result')
except Exception as e:
    print('Invoke raised exception:', e)
    traceback.print_exc()

# Now try to reproduce the prompt formatting step for the verdict
try:
    parser = JsonOutputParser(pydantic_object=VerdictOutput)
    fi = parser.get_format_instructions()
    # prepare dummy signal and reality dicts
    signal = {
        "status": "ok",
        "signal_summary": "Test summary",
        "domain": "AI/ML",
        "time_horizon": "short",
        "confidence_level": "medium",
        "user_context_summary": "AI/ML engineer"
    }
    reality = {
        "feasibility": "medium",
        "market_signal": "mixed",
        "risk_factors": ["risk1","risk2"],
        "known_unknowns": ["u1"],
        "hype_score": 5,
        "evidence_summary": "ecosystem patterns"
    }
    print('\n-- Attempting to format BASE_VERDICT_PROMPT with format_instructions (raw) --')
    formatted = BASE_VERDICT_PROMPT.format_messages(
        status=signal["status"],
        feasibility=reality["feasibility"],
        market_signal=reality["market_signal"],
        hype_score=reality["hype_score"],
        memory_context="No relevant memories found.",
        format_instructions=fi
    )
    print('Formatted content length:', len(formatted[0].content))
    print('==== START FORMATTED PROMPT ====>')
    print(formatted[0].content)
    print('==== END FORMATTED PROMPT ====>')
except Exception as e:
    print('Formatting raised exception:', e)
    traceback.print_exc()

# Try again with escaped format_instructions
try:
    fi_escaped = fi.replace('{', '{{').replace('}', '}}')
    print('\n-- Attempting to format with escaped format_instructions --')
    formatted2 = BASE_VERDICT_PROMPT.format_messages(
        status=signal["status"],
        feasibility=reality["feasibility"],
        market_signal=reality["market_signal"],
        hype_score=reality["hype_score"],
        memory_context="No relevant memories found.",
        format_instructions=fi_escaped
    )
    print('Formatted2 content length:', len(formatted2[0].content))
    print('==== START FORMATTED PROMPT 2 ====>')
    print(formatted2[0].content)
    print('==== END FORMATTED PROMPT 2 ====>')
except Exception as e:
    print('Formatting with escaped fi raised exception:', e)
    traceback.print_exc()
