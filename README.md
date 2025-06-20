# Desenvolupament d’un agent d’IA per a un wallet d’Ethereum

Un assistent conversacional basat en **ElizaOS** que et permet gestionar **múltiples subcomptes** d’un sol wallet d’Ethereum, crear transaccions **sense signar** i consultar saldos/històrics, tot mantenint el paradigma ***self‑custody*** (les claus privades mai surten del teu control) fileciteturn0file3.

> **Nou!** El projecte **ja inclou una còpia vendored d’ElizaOS** i un **personatge de prova** (\_sample persona\_) perquè puguis començar a xatejar sense configuracions addicionals.

---

## ✨ Funcionalitats clau

| Mòdul                   | Què fa?                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `manageSubAccounts`     | Llista, crea i etiqueta subcomptes derivats d’una mateixa **xpub** fileciteturn0file1                                         |
| `createUnsignedTx`      | Genera transaccions Ethereum sense signar (amb camps *from*, *to*, *value* i *data* per a smart‑contracts) fileciteturn0file2 |
| `seeBalances`           | Recupera saldo i últimes transaccions d’una adreça o àlies a la testnet **Sepolia** fileciteturn0file2                        |
| Històrics & projeccions | Analitza hàbits de despesa i projecta l’evolució futura dels fons fileciteturn0file2                                          |
| Persistència de memòria | Guarda accions i context per converses coherents i sense bucles fileciteturn0file2                                            |

> **Limitacions:** Eliza V1 només pot executar **una acció per *prompt*** i, ocasionalment, pot caldre repetir instruccions perquè l’agent les completi correctament fileciteturn0file2.

---

## ⚙️ Requisits

| Tipus            | Versió mínima | Notes                                                         |
| ---------------- | ------------- | ------------------------------------------------------------- |
| **Node.js**      | 18            | Recomanat 20+                                                 |
| **pnpm**         | 8             | Gestor de paquets PNPM ([https://pnpm.io/](https://pnpm.io/)) |
| **Python**       | 3.10          | Només necessari per la capa d’anàlisi (opcional)              |
| **RPC Ethereum** | Sepolia       | Ex. **QuickNode** o Alchemy                                   |
| **Wallet**       | MetaMask      | Per signar transaccions                                       |

> ℹ️ **ElizaOS ja ve integrada** dins el directori `vendor/elizaOS`, per tant **no cal instal·lar‑la ni afegir‑la com a dependència**.

Variables d’entorn principals:

```sh
OPENAI_API_KEY   # Clau d’API OpenAI
XPUB             # Extended public key de la seed
RPC_URL          # Endpoint Ethereum Sepolia
```

---

## 🚀 Instal·lació i primer arrencat (1 minut)

```bash
# 1. Clona el repositori
$ git clone https://github.com/Jeii23/TFGpluginEliza.git
$ cd TFGpluginEliza

# 2. Instal·la dependències de Node amb pnpm
$ pnpm install

# 3. Compila codi TypeScript/Web (si escau)
$ pnpm build

# 4. Arrenca el servidor de l’agent
$ pnpm start

# 5. (Opcional) Arrenca el client web per interactuar via navegador
$ pnpm start:client
```

Ara obre `http://localhost:5173` (o el port que indiqui la consola) i saluda al personatge de prova!


---

## 🗨️ Ús bàsic via xat

* «`Crea un subcompte per a "viatges"`»
* «`Mou 0.001 ETH de viatges a hipoteca`»
* «`Mostra el saldo i les 5 últimes transaccions de hipoteca`»

El bot retornarà un JSON d’*unsignedTx* ➡️ obre‑l a `web/tx‑signer`, confirma a MetaMask i envia‑la.

---



## 🔒 Seguretat

* **Claus privades fora de perill:** només es fa servir la `xpub`; la signatura final sempre és manual a MetaMask fileciteturn0file3.
* **Mode local recomanat:** els *prompts* enviats a models de núvol podrien quedar registrats.
* **Accions 1‑a‑1:** cada petició executa una sola acció; per operacions complexes fes passos successius.

---

## 🚧 Roadmap

* Migració a **Eliza V2** per executar accions en paral·lel
* Tests d’engany i sandboxing per millorar la robustesa
* Assistents per desplegar i verificar *smart‑contracts*
* Internacionalització (EN/ES) del xat / client

---


## ✉️ Contacte

Jaume Costa – [jaume.costa@autonoma.cat](mailto:jaume.costa@autonoma.cat)
Per dubtes, oberts a issues i suggeriments al repositori!
