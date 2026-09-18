# Stage 1 Report: Team Formation & Idea Dev

### Raccon is comming for your cookies
![alt text](images.png)

### Table of Contents

- [Team Formation Overview](#team-formation-overview)
- [Ideas Explored](#ideas-explored)
- [Selected MVP Concept: Raccon](#selected-mvp-concept-raccon)
  1. [Summary](#summary)
  2. [Reasons for Selection](#reasons-for-selection)
- [LEAP26 Validation & Feedback Summary](#leap26-validation--feedback-summary)
     1. [Key Findings](#key-findings)
- [Authors](#authors)

## Team Formation Overview

Raccon team, **EAGO TEAM**, will contribute across different areas of software engineering, including business analysis, backend development, frontend development, and DevOps. However, each member will be assigned a primary role to streamline the process of designing, building, and maintaining the project while ensuring clear ownership and responsibilities.


| Member | Role |
| --- | --- |
| **Abdulrahman Alsalhi** - [ARAlsalhi](https://github.com/ARAlsalhi) | Solution Architect - Frontend |
|  **Eman Hamdan** - [iEmanHamdan](https://github.com/iEmanHamdan) | Project Manager - Frontend |
| **Ghaida Alsabti** - [Ghaaidda](https://github.com/Ghaaidda) | QA - Backend |
| **Osama Alhamdan** - [t8pr](https://github.com/t8pr) | DevOps - Full-stack |

## Ideas Explored

The team evaluated multiple concepts before settling on Raccoon platform. The table below summarizes some of the ideas we considered, providing a brief description of each concept along with its key strengths and weaknesses. Additionally, it outlines our reasoning for rejecting or deciding not to pursue each idea further.

| Idea | Description | Strengths | Weaknesses | Outcome |
| --- | --- | --- | --- | --- |
| Clubs WhiteLabel | A unified platform for university clubs across Saudi Arabia to manage activities, attendance, and event documentation in one place. | Highly original, no existing equivalent; addresses a real visibility gap between university clubs buildable with standard, accessible technology. | No clear revenue model; students are unlikely to pay, limiting a subscription approach; technically straightforward, which may not show enough depth for a capstone. | Not rejected, but set aside for a concept with a more distinctive technical twist. |
| Jeneral Pass | A platform connecting freelance journalists with event organizers, letting journalists apply for media/press access while organizers vet credentials before granting passes. | Addresses a real industry problem in press-pass access and verification; could build a professional journalism community; gives journalists early, verified event access. | Current accreditation process isn't well understood yet; journalist adoption is unvalidated; issuing passes may involve legal, identity-verification, and integration complexity. | Not rejected, seen as one of the strongest problems explored, but needs more market, industry, and regulatory research than the project timeline allows. A candidate for future development. |

Neither Clubs WhiteLabel nor Jeneral Pass was rejected for weakness; the team chose to pursue a different concept offering a more distinctive technical challenge, described below.

## Selected MVP Concept: Raccon

### Summary

Raccon is a platform that allows users to create and customize discovery experiences for different places using **NFC Cards**, creating a treasure-hunt-style experience.


It offers two types of experiences. The first is a **Sequential Experience**, which guides users from one place to another step by step. It focuses more on discovering and exploring a new place, for example, at events like LEAP or Money20/20.


The second is an **Open Hunt Experience**, where users can explore freely, with more focus on competition, especially when playing in groups. Each **NFC Card** is hidden in a different location. Finding one card reveals a clue that leads users to another card, while some cards can contain traps that make users lose points. And that will level up the competition.

### Reasons for Selection

| **Reason** | **Description** |
|---|---|
| **1. WOW Factor** | Looking beyond typical software engineering technologies, the team explored the **Near Field Communication (NFC)** cards a short-range wireless technology usually limited to business cards, product tags, payments, and keycards. Inspired by a social media post about a creative NFC use case (someone turning their home into a mini scavenger hunt using fact-tagged NFC chips), the team saw an opportunity to build an underused technology into a capstone project. |
| **2. Vision 2030 Alignment** | NFC-driven physical activity aligns with Saudi Vision 2030's focus on movement and initiatives like the Sports Boulevard, and with tourism, where historic sites could be brought to life through activity based experiences. |
| **3. Technical Appropriateness** | The concept directly applies the capstone's core areas **authentication, databases, and full-stack development** while pushing the team to learn a new frontend framework and design a flexible database schema for experience customization, both seen as valuable learning opportunities. |

## LEAP26 Validation & Feedback Summary

Following our in-person validation at LEAP26 through conversations with entrepreneurs, investors, and event managers, including the **Kingdom of Games** team. we gathered vital qualitative insights. While most feedback was verbal, survey results from 10 respondents (9 players, 1 investor) collected from Sep 2–Sep 11 

### Key Findings

```mermaid
flowchart TD
    A[LEAP Validation] --> B[Player Feedback]
    A --> C[Product Insights]
    A --> D[Business Opportunities]
    A --> E[Potential Partnership]
```
| **Feedback Area** | **Key Insight** |
|---|---|
| **NFC Excitement** | 8 out of 9 players responded positively to the technology. |
| **Willingness to Play** | 6 players expressed positive willingness to engage. One price-sensitive response reflected a pricing concern rather than a concept objection. |
| **Pricing Concerns** | Responses ranged from SAR 100–150 to requests for lower pricing, indicating price sensitivity worth testing against an ~SAR 80 ceiling. |
| **Feature Requests** | Two respondents suggested AI-assisted content generation for easier clue and question creation. |
| **Technical Suggestion** | One respondent proposed password-based chip unlocking to enforce sequencing. |
| **Usage Model** | Concerns about engagement fading led to a suggestion for one high-traffic venue with redeemable rewards. |
| **Business Potential** | One respondent identified marketing campaign and retention use cases. |
| **Investor Response** | The investor viewed the concept positively for the Saudi market but flagged customer acquisition and experience clarity risks. |
| **Kingdom of Games** | Their team responded positively. A proof of concept will be shared at a later stage. | 

Overall, the validation through direct feedback and suggestions was a significant factor in the team's decision to pursue with **Raccon** over alternative concepts. 


### Authors
* **Eman Hamdan** - [iEmanHamdan](https://github.com/iEmanHamdan)
* **Ghaida Alsabti** - [Ghaaidda](https://github.com/Ghaaidda)
* **Abdulrahman Alsalhi** - [ARAlsalhi](https://github.com/ARAlsalhi)
* **Osama Alhamdan** - [t8pr](https://github.com/t8pr)
