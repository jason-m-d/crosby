> **Original Prompt:** "You are helping me plan the architecture for Crosby v2. This is an AI personal assistant built on Next.js (App Router) + TypeScript + Supabase, with Claude as the LLM routed through OpenRouter. The product vision is to evolve Crosby into a platform where capabilities ('silos') are composable modules that users can eventually create and connect themselves. I need production-focused research on the following 4 domains of extensible AI assistant architecture in 2026: (1) Plugin/extension architecture for AI assistants — how production systems in 2026 structure extensibility, MCP vs. other protocols, what to put in core vs. plugins; (2) Declarative tool and integration definition — JSON/YAML-based tool registration, capability manifests, tool permission scoping; (3) Agentic integration building — how production systems handle 'connect my Shopify' type flows in 2026, OAuth-as-a-service platforms (Nango, Composio, Merge), webhook ingestion architecture; (4) Multi-tenant considerations — user data isolation, per-user token storage, decisions to make now even when single-user."

---

# The Architecture of Extensibility: Silo-Based AI Assistant Systems and the Model Context Protocol in 2026

The structural evolution of artificial intelligence assistants has reached a critical juncture in 2026, transitioning from primitive, hardcoded chat interfaces toward sophisticated, multi-surface operating layers. This transition is characterized by a fundamental shift in how capabilities are integrated into the core reasoning engine. The industry has moved beyond the "plugin" models of 2023 and 2024, which were often brittle and lacked standardized communication protocols, toward a modular "silo" architecture. In this paradigm, every capability—whether it is email management, CRM orchestration, or retail POS integration—is treated as a self-contained, pluggable unit that registers its metadata, tools, and UI components with a central orchestrator. This report examines the technical foundations of these extensible systems, focusing on the Model Context Protocol (MCP) as the primary integration layer, the rise of declarative tool definitions, the mechanics of agentic integration building, and the rigorous requirements of multi-tenant production environments.

## **The Paradigm Shift to Multi-Surface Operating Layers**

By early 2026, the leading AI assistants—ChatGPT, Claude, and Gemini—have successfully crossed the threshold from interesting chatbots to comprehensive operating layers that span web applications, mobile interfaces, APIs, and autonomous coding agents.1 The market has repriced around three distinct product philosophies, each catering to different segments of the productivity and engineering lifecycle. ChatGPT remains the versatile generalist, excelling in breadth of knowledge and rapid solution generation, while Anthropic's Claude has established itself as the preferred choice for complex reasoning, high-stakes debugging, and architectural planning.2 Google's Gemini, meanwhile, leverages its unprecedented context window of over one million tokens to dominate workflows within the Google Workspace and Cloud ecosystem.2

This maturity is not merely a result of increased parameter counts or improved training data; it is the result of a deliberate architectural decision to embrace extensibility. The "silo" model allows developers to encapsulate specific business logic and data connections within modules that are independent of the underlying Large Language Model (LLM). This modularity is essential for scaling AI systems that must interact with a diverse array of third-party services, such as Shopify, Toast POS, or Stripe.5 In production, the distinction between a "core platform" and an "extension" is increasingly defined by the reliability and latency requirements of the task. Core platforms manage the central reasoning engine, identity, and security, while extensions—or silos—handle the specific technical surface of external APIs.5

### **Competitive Landscape of Assistant Architectures**

The architectural philosophies of 2026 are best observed through the lens of how each major provider handles the integration of external context and functional tools.

| Feature | ChatGPT (OpenAI) | Claude (Anthropic) | Gemini (Google) |
| :---- | :---- | :---- | :---- |
| Primary Extension Model | GPTs & MCP-compatible SDK | MCP (Model Context Protocol) | Vertex AI Extensions & MCP |
| Context Handling | Persistent memory & Code Interpreter | 200K+ Context; Extended Thinking | 1M+ Context; Multi-repo analysis |
| Integration Philosophy | Native ecosystem; broad tool use | "Agentic" silos; safety-first reasoning | Workspace-native; multimodal collaboration |
| User Interface | Adaptive UI & Apps SDK | 3-Mode App (Chat, Cowork, Code) | AI Overviews & Search-integrated |

The shift toward "Agentic" assistants means that these systems no longer just talk about tasks but perform them autonomously on the user's computer or in the cloud. Claude's desktop application exemplifies this, offering a specialized "Code" mode for terminal-based automation and a "Cowork" mode for organizing files and generating complex reports.3 This separation of concerns allows the assistant to adapt its reasoning strategies and toolsets to the specific domain of the silo it is currently interacting with.

## **The Model Context Protocol: The Standard for Tool Integration**

The most significant advancement in assistant architecture is the universal adoption of the Model Context Protocol (MCP). Introduced by Anthropic in late 2024 and subsequently adopted by OpenAI, Google, Microsoft, and the broader open-source community, MCP has become the de facto protocol for connecting AI systems to real-world data and tools.8 MCP addresses the "NxM problem," where N models previously required custom code to integrate with M services. By standardizing the interface through which a model discovers and invokes external capabilities, MCP has effectively become the "USB-C for AI".8

### **MCP Architecture and Primitives**

The Model Context Protocol operates on a client-server architecture, largely inspired by the Language Server Protocol (LSP). In this ecosystem, the "Host" is the AI application (such as Claude Desktop or a custom enterprise assistant), and the "MCP Server" is the integration silo that exposes specific functions and data.6 Communication occurs using JSON-RPC 2.0 as the underlying message standard, ensuring a structured and auditable exchange of information.10

The protocol is built around three core primitives that allow a silo to register its capabilities:

1. **Tools**: These are executable functions that allow the AI model to take actions in the external system. A Shopify silo might expose tools like create\_discount\_code or get\_inventory\_levels. Tools are model-controlled, meaning the LLM decides when to invoke them based on the user's intent.6
2. **Resources**: These represent application-controlled data sources. Unlike tools, which are active, resources are typically read-only contexts, such as a log file, a database schema, or a documentation page. The host application decides when to provide these resources to the model.6
3. **Prompts**: These are user-controlled templates that guide the model on how to interact with the silo. A silo can provide "prompt snippets" that help the model understand the nuances of a specific business process, such as a specialized "RFP Response" template.6

### **Transport Layers and Connectivity**

MCP supports two primary transport methods for establishing the connection between the host and the silo. For local integrations where the server runs on the same hardware as the assistant, the protocol uses **Standard Input/Output (STDIO)**. For remote, cloud-hosted silos, it utilizes **HTTP with Server-Sent Events (SSE)**, which provides a robust mechanism for streaming data and handling asynchronous notifications.10 This flexibility allows the silo architecture to scale from local developer tools to enterprise-grade cloud services.

### **Performance Challenges: The Tax of Abstraction**

Despite its benefits, the adoption of MCP in 2026 has revealed two primary architectural bottlenecks: the "Double Hop Tax" and "Context Window Bloat".8

The **Double Hop Tax** refers to the latency introduced by the intermediary MCP server. In a standard direct integration, an agent communicates directly with a tool API. In MCP, the agent sends a request to the MCP Server, which parses it, reformats it for the native API, and then forwards it. The response must travel back through the same chain. While a single call might only add 20 to 50 milliseconds, complex workflows requiring 20 or 30 sequential tool calls can result in non-trivial execution delays.8

**Context Window Bloat** occurs because the current MCP specification often requires the host to inject the full list of tool names, descriptions, and JSON schemas into the LLM's context window before any processing begins.8 A single complex tool schema can consume 200 tokens. Connecting multiple silos—such as GitHub, Slack, and a custom CRM—can quickly burn through 20,000 to 30,000 tokens on tool descriptions alone, leaving less room for the actual task data and increasing API costs.8

### **Mitigation Strategies for Performance and Scale**

To address these limitations, 2026 production systems have implemented several advanced mitigation strategies.

| Problem | Mitigation Strategy | Technical Implementation |
| :---- | :---- | :---- |
| Double Hop Tax | Universal Tool Calling Protocol (UTCP) | Eliminates intermediary servers; agents call native endpoints directly via a JSON "manual." |
| Context Bloat | Progressive Discovery | Only injects tool schemas as the agent specifically identifies a need for that capability. |
| Stateful Sessions | Distributed State Management | Implements sticky sessions or shared Redis stores to handle MCP's stateful design in load-balanced environments. |
| Latency | Native Function Calling | Bypasses MCP in favor of provider-specific APIs (e.g., Anthropic Tool Use API) for high-frequency tasks. |

By March 2026, many developers are also adopting **Cap'n Proto** as an alternative transport layer to replace JSON-RPC. Cap'n Proto's zero-copy design significantly reduces the message-passing overhead, solving the performance issues associated with high-frequency tool calls in numeric-heavy or real-time scenarios.13

## **Declarative Tool and Integration Definition**

A core requirement for a truly extensible AI assistant is the ability to define integrations declaratively rather than through imperative code. This shift allows non-developers to create or modify silos using natural language, as the assistant can translate intent into a structured specification.14

### **The Cognitive Blueprint vs. The Runtime Engine**

The 2026 architectural standard for declarative agents centers on a strict separation between the **Cognitive Blueprint** and the **Runtime Engine**.15 The Cognitive Blueprint is a language-agnostic specification (usually in YAML or JSON) that defines the agent's identity, roles, and capabilities. The Runtime Engine is the platform-specific execution layer that instantiates the agent and handles the actual tool calls.15

Declarative definitions provide several advantages for production systems:

* **Version Control**: Integration logic can be stored in Git, allowing for auditability and rollback capabilities.14
* **Portability**: A YAML-defined silo can be moved between different assistant providers (e.g., from an internal custom assistant to ChatGPT) without rewriting the core logic.10
* **Consistency**: Entire teams can run identical silo environments, eliminating the "works on my machine" problem.16

### **Natural Language to Integration (NLI)**

Production examples of AI systems building their own integrations have emerged prominently in 2026. Platforms like **Flatlogic**, **Lovable**, and **Replit** allow users to describe a functional application or integration in plain English.17 The AI Software Development Agent then scaffolds a production-grade project including authentication, database schemas, and the necessary MCP Server definitions.17

This "Agentic Integration Building" workflow typically follows a structured sequence:

1. **Discovery**: The user says, "Connect my Shopify." The assistant identifies the Shopify API endpoints and the required OAuth scopes.18
2. **Schema Generation**: The assistant generates the JSON schemas for the required Shopify tools (e.g., get\_customer\_orders).18
3. **Auth Orchestration**: The assistant initiates the OAuth 2.1 flow, managing the redirect and token exchange through a secure vault like **Nango** or **Scalekit**.19
4. **Sync Job Creation**: The assistant sets up the background jobs required for continuous data synchronization, often using a "Unified API" to normalize the data.5

### **Tool Permissions and Scoping**

In a siloed architecture, ensuring that one plugin cannot access the data of another is paramount. Production systems implement fine-grained tool permissions and "Progressive Scoping".11 When a silo is first connected, it is granted a minimal set of permissions. As the user asks for more complex tasks, the assistant requests additional scopes out-of-band.11

The boundary between silos is enforced at the database and session level. In 2026, **OAuth 2.1** has become the mandatory standard for protecting sensitive resources in remote MCP environments.10 This includes the use of **PKCE (Proof Key for Code Exchange)** for both public and backend clients to prevent code injection attacks.19

## **Agentic Integration Building and OAuth-as-a-Service**

Connecting an AI agent to a third-party service like Shopify or Toast POS is significantly more complex than standard user-level authentication. Agents must operate autonomously, often while the user is offline, requiring long-lived delegated authority rather than short-lived sessions.19

### **The Role of OAuth-as-a-Service**

For consumer applications that need to connect to hundreds of different APIs, building custom auth logic for each is no longer viable. In 2026, **OAuth-as-a-Service** providers like **Nango**, **Merge**, and **Paragon** have emerged as the standard infrastructure layer.5

These platforms provide several critical capabilities:

* **Unified API Aggregation**: They abstract different APIs within a category (e.g., accounting or CRM) into a single API. A developer integrates once with the aggregator and gains access to dozens of systems.5
* **Token Lifecycle Management**: They handle the "Authentication Nightmares" of token refreshing, encryption at rest, and proactive refresh five minutes before expiration.7
* **Conflict Resolution**: They manage provider-specific quirks, such as "Hostile Rate Limits" or "Pagination Chaos," ensuring the AI agent receives a clean, normalized data stream.7

### **Webhook Ingestion and Routing**

For a plugin system to remain contextually aware, it must be able to ingest real-time events. The industry standard in 2026 is the use of an **AI Gateway** that acts as a generic webhook receiver.22

The AI Gateway performs three primary functions:

1. **Ingress and Security**: It receives the webhook (e.g., a "New Order" event from Shopify), validates the signature, and prevents server-side request forgery (SSRF) by validating the target URLs.22
2. **Contextual Routing**: It routes the event to the specific silo (MCP Server) that owns that connection. This routing is increasingly "Intelligent," selecting the appropriate model or agent based on the content of the request.23
3. **Result Enhancement**: It can scan the model-generated response for policy violations or sensitive data before sending it back to the third-party system.23

## **Multi-Tenant Considerations for Extensible AI**

As an assistant product scales from a single-user prototype to a multi-tenant platform, the architectural decisions made early on regarding data isolation and token management become critical. Failing to implement robust isolation can lead to data leaks where Tenant A's agent accidentally accesses Tenant B's data—a catastrophic failure in the era of strict AI governance.24

### **Data Isolation Models**

In 2026, three primary data isolation models are used for multi-tenant AI systems, each with distinct trade-offs in terms of cost, complexity, and security.

| Model | Data Architecture | Isolation Level | Best Fit for 2026 |
| :---- | :---- | :---- | :---- |
| **Silo Model** | Separate Database per Tenant | Highest | Regulated industries (Healthcare, Finance). |
| **Bridge Model** | Separate Schema per Tenant | High | Mid-market customers with moderate compliance needs. |
| **Pool Model** | Shared Schema (Tenant ID column) | Logical (via RLS) | Cost-efficient consumer AI and SMB platforms. |

For the majority of consumer AI assistants, the **Pool Model** is the standard, but it is reinforced with **Row-Level Security (RLS)** implemented at the database engine level.27 RLS ensures that every query is automatically filtered by the tenant\_id associated with the current session. This provides a "safety net" that is always on, even if the application developer forgets to include a WHERE tenant\_id = ? clause in the code.28

### **Per-User Token Storage and Encryption**

Managing OAuth tokens for thousands of users requires a specialized "Token Vault" architecture. A production-ready design in 2026 must separate logical ownership from physical access.19

The critical requirements for token storage include:

* **Envelope Encryption**: Use centralized Key Management Services (KMS) to manage per-tenant Data Encryption Keys (DEKs). Tokens should never be stored or logged in plain text.19
* **Binding to Identity**: Every token record must be explicitly associated with a unique tenant\_id and user\_id to prevent cross-tenant credential usage.19
* **Distributed Locking during Refresh**: When multiple background workers attempt to refresh the same user's token simultaneously, it can cause the provider to invalidate the refresh token. Distributed locks ensure that refresh operations are atomic and coordinated.19

## **Interactive Extensibility: The Rise of MCP Apps**

The traditional "text-only" chat interface is rapidly being replaced by interactive interfaces where AI agents can deliver dashboards, forms, and specialized business tools directly within the chat window.20 This is standardized through the **MCP Apps extension** (introduced as SEP-1865), a collaboration between Anthropic, OpenAI, and the broader MCP community.29

### **The Technical Specification of MCP Apps**

The MCP Apps extension allows an MCP Server to return interactive HTML UIs rendered in sandboxed iframes. This architecture prevents a malicious silo from compromising the host application while allowing for rich, bidirectional communication.12

| Component | Technical Implementation |
| :---- | :---- |
| **Resource Scheme** | Uses ui:// (e.g., ui://weather-server/dashboard). |
| **MIME Type** | Served as text/html+mcp. |
| **Communication Bridge** | JSON-RPC messages over postMessage using the @modelcontextprotocol/sdk. |
| **Metadata Key** | Tools register UI templates via \_meta.ui.resourceUri. |

This standard enables a "Connect my Shopify" workflow where the assistant can render a live "Order Dashboard" widget. The user can interact with the widget (e.g., clicking "Cancel Order"), which triggers a tool call on the Shopify MCP Server. The result is then pushed back to the UI, creating a seamless app-like experience within the conversational flow.12

### **Multi-Server Orchestration and Conflict Resolution**

In a production environment, a single user request often requires the assistant to orchestrate data across multiple specialized silos.6 For example, if an engineer asks, "Is it safe to deploy?" the assistant must simultaneously query the GitHub silo for critical bugs, the Datadog silo for error rates, and the PagerDuty silo for active incidents.6

The host application acts as the central authority in this orchestration, deciding which servers to connect to and how to synthesize conflicting outputs. Conflict resolution is typically handled through "Plugin-Based Orchestration" using frameworks like **Semantic Kernel**.31 The orchestrator uses natural language descriptions to choose the most relevant silo for each sub-task, often invoking multiple plugins in parallel or chaining them sequentially if one agent's output is required as input for another.31

## **Security, Governance, and the EU AI Act**

By 2026, the architectural design of AI assistants is heavily influenced by the regulatory landscape, particularly the first major enforcement cycle of the **EU AI Act**.24 High-risk AI systems and general-purpose models are subject to stringent transparency, documentation, and oversight requirements.24

### **AI Governance as Infrastructure**

Governance is no longer an afterthought but is built into the integration protocol itself. MCP includes built-in hooks for:

* **User Consent and Control**: Every tool invocation and data access request must be clearly understood and approved by the user through authorization screens.32
* **Monitoring and Auditing**: Regularly checking LLM activity and silo interactions is mandatory to find unusual behavior or potential misuse. Strong logging and auditing systems are required to track data movement and tool usage.20
* **Secure Output Handling**: Outputs from MCP interactions must be sanitized to prevent cross-site scripting (XSS) or other web application attacks.32

The role of the **AI Gateway** becomes critical here, acting as the enforcement point for fine-grained policies, dynamic throttling, and behavioral guardrails.22

## **Conclusion: The Roadmap to Production Extensibility**

The development of an extensible AI personal assistant in 2026 requires a rigorous, protocol-driven approach. Moving from hardcoded integrations to a silo-based architecture is best accomplished by adopting the **Model Context Protocol** as the foundational integration layer. This choice ensures vendor neutrality and allows the system to tap into a rapidly growing ecosystem of thousands of pre-built MCP servers.6

Architects must prioritize the following for a production-ready system:

1. **Embrace Declarative Patterns**: Separate the cognitive blueprint from the runtime engine to allow for natural language integration building and simplified maintenance.15
2. **Leverage OAuth-as-a-Service**: Do not build custom authentication logic; use infrastructure providers like Nango or Scalekit to manage the complex lifecycle of agentic tokens.18
3. **Implement Row-Level Security**: Ensure multi-tenant data isolation at the database level to provide defense in depth and meet regulatory requirements.28
4. **Adopt the MCP Apps Standard**: Prepare for "beyond text" interactions by building silos that can deliver interactive UI widgets via the standardized iframe bridge.20

By treating integrations as standardized silos rather than bespoke features, developers can create AI assistants that are not only more powerful but also significantly more secure, scalable, and resilient to the rapid shifts in the 2026 technology landscape. The transition from a "chatbot" to an "operating layer" is now the baseline for professional AI systems.
