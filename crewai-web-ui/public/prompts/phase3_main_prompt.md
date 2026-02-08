
Your task is to generate the content for the `main.py` file, which serves as the entry point for the CrewAI project and is compatible with the `crewai` CLI. Use the JSON object provided as the single source of truth.

**Objective:**
Generate a Python script based on the provided template. The script must dynamically create an `inputs` dictionary for the `run()`, `train()`, and `test()` functions.
*   **User Inputs:** If `user_inputs` are defined in the `project_config.yaml`, generate code to populate the `inputs` dictionary.
    *   Iterate through the `user_inputs` list from the configuration.
    *   For each item, use `name` as the key and `value` as the default value.
    *   Example: If `user_inputs` has `[{"name": "topic", "value": "AI"}]`, generate `inputs = {'topic': 'AI'}`.
*   **Placeholders:** If no `user_inputs` are defined, leave `inputs = {}`.

No explication shoudl be provided, just output the code.


**Template:**
Use the following Python code as a template for the `main.py` file.


```python
#!/usr/bin/env python
import sys
import warnings
from datetime import datetime
from crewai_generated.crew import CrewaiGenerated

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

# This main file is intended to be a way for you to run your
# crew locally, so refrain from adding unnecessary logic into this file.
# Replace with inputs you want to test with, it will automatically
# interpolate any tasks and agents information

def run():
    """
    Run the crew.
    """
    # Dynamically generated inputs will be placed here
    # If `user_inputs` are present in the project configuration, populate this dictionary.
    # Example:
    # inputs = {
    #    'topic': 'AI LLMs'
    # }
    inputs = {
        # ... generate input fields here based on user_inputs from project_config.yaml ...
    }
    try:
        CrewaiGenerated().crew().kickoff(inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while running the crew: {e}")

def train():
    """
    Train the crew for a given number of iterations.
    """
    # Dynamically generated inputs will be placed here
    inputs = {
        # ... generate input fields here based on user_inputs from project_config.yaml ...
    }
    try:
        CrewaiGenerated().crew().train(n_iterations=int(sys.argv[1]), filename=sys.argv[2], inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}")

def replay():
    """
    Replay the crew execution from a specific task.
    """
    try:
        CrewaiGenerated().crew().replay(task_id=sys.argv[1])
    except Exception as e:
        raise Exception(f"An error occurred while replaying the crew: {e}")

def test():
    """
    Test the crew execution and returns the results.
    """
    # Dynamically generated inputs will be placed here
    inputs = {
        # ... generate input fields here based on user_inputs ...
    }
    try:
        CrewaiGenerated().crew().test(n_iterations=int(sys.argv[1]), eval_llm=sys.argv[2], inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")

    try:
        CrewaiGenerated().crew().test(n_iterations=int(sys.argv[1]), eval_llm=sys.argv[2], inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")

def run_streamlit():
    from streamlit.web import cli as stcli
    import socket
    from contextlib import closing
    
    def find_free_port(start_port=8501):
        """Find the first available port starting from start_port."""
        port = start_port
        while port < 9000:  # Reasonable upper limit
            with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
                if sock.connect_ex(('localhost', port)) != 0:
                    return port
                port += 1
        raise RuntimeError("No available ports found between 8501 and 9000")
    
    try:
        # Determine available port and construct URL
        port = find_free_port(8501)
        host = "localhost"
        url = f"http://{host}:{port}"
        
        # Output the URL before starting
        print(f"\n{'='*60}")
        print(f"STREAMLIT_URL: {url}")
        print(f"{'='*60}\n")
        
        # Set arguments with explicit port to ensure URL matches
        sys.argv = [
            "streamlit", 
            "run", 
            "streamit.py",
            "--server.port", str(port),
            "--server.address", host
        ]
        sys.exit(stcli.main())
        
    except Exception as e:
        raise Exception(f"An error occurred while running the streamlit app: {e}")
```
