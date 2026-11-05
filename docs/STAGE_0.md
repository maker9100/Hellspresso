# HELLSPRESSO — 0단계

기준: 제공된 SPEC, 2026-11-05. 이번 단계는 설계와 상수 정의만 다룬다. 게임 구현과 프로젝트 설정은 1단계부터 진행한다. 아래 추천안도 미확정 임시값이다.

## 구현 전 질문

| 번호 | 확인할 내용 | 추천안 |
|---|---|---|
| 1 | 요청은 수리검도 확정 재료 사용을 요구하지만 SPEC 6.1·18.3은 제작법 미정이다. 어느 쪽을 적용할까? | SPEC을 기준으로 커터칼 날3+정수25→수리검3발을 임시값으로 둔다. 기관 샤프의 샤프2+샤프심통1+심장3은 확정값 그대로다. |
| 2 | 진행 저장 시점 제한에 부활 불가 사망의 즉시 기록을 예외로 추가할까? | 사망은 필수 예외로 둔다. 같은 브라우저의 사망은 로컬 저널로 보호하고 클라우드는 재시도한다. 다른 기기에 전달되지 않은 오프라인 사망의 즉시 반영은 보장 불가다. |
| 3 | 신성지대의 회복·오버차지·반복 저장·수동 저장은 어떻게 처리할까? | 최초 HP=max(현재,100), CAF=max(현재,100). 오버차지는 보존한다. 재진입은 CAF 감소만 정지한다. 진행 저장은 최초 진입뿐이며 수동 저장은 제외한다. 설정은 별도 로컬 저장한다. |
| 4 | ESC·탭 비활성화 때도 시간이 흐를까? | ESC·포커스 상실·숨겨진 탭은 정지. 인벤토리는 자원·적·피격이 계속된다. 클릭으로 재개한다. |
| 5 | 일반 난이도 부활 시 자원·소지품을 어떻게 복구할까? | 마지막 체크포인트 스냅샷을 복구하고 HP·CAF는 기본치 이상으로 보정한다. STA·소지품은 스냅샷 값이며 최초 방문 플래그는 초기화하지 않는다. |
| 6 | 순수한 영혼 모드의 HP 회복품을 허용할까? | 허용한다. 맨손 공격력1만 허용하고 무기 장착·공격·제작 무기 사용은 차단한다. 추출기는 허용한다. |
| 7 | H 확정과 키 변경 요구를 어떻게 조화시킬까? | H와 ESC를 예약키로 두고 나머지는 변경한다. 슬라이드는 C 기본+Ctrl 별칭. 브라우저의 Ctrl+W 차단은 보장하지 않는다. |

## 파일 트리

괄호는 생성 단계다. 현재는 이 문서와 config 2개만 존재하며 나머지는 계획이다.

```text
hellspresso/
  docs/STAGE_0.md                         (0)
  src/config/rules.ts                    (0)
  src/config/tunables.ts                 (0)
  index.html                             (1)
  package.json                           (1)
  package-lock.json                      (1)
  tsconfig.json                          (1)
  vite.config.ts                         (1)
  vitest.config.ts                       (1)
  .gitignore                             (1)
  .env.example                           (1, Firebase 연결 4)
  README.md                              (1, 배포 절차 7)
  src/main.ts                            (1)
  src/vite-env.d.ts                      (1)
  src/styles.css                         (1)
  src/core/Game.ts                       (1)
  src/core/FixedStepLoop.ts              (1)
  src/core/GameStateMachine.ts           (1)
  src/core/Input.ts                      (1)
  src/core/PointerLock.ts                (1)
  src/player/Movement.ts                 (1)
  src/player/Resources.ts                (1)
  src/physics/CollisionWorld.ts          (1)
  src/assets/registry.ts                 (1)
  src/assets/procedural.ts               (1)
  src/ui/HUD.ts                          (1)
  src/ui/Menu.ts                         (1)
  src/ui/Settings.ts                     (1)
  src/combat/Weapons.ts                  (2)
  src/combat/ProjectilePool.ts            (2)
  src/combat/Damage.ts                    (2)
  src/enemies/Demon.ts                    (2)
  src/enemies/EnemySystem.ts              (2)
  src/enemies/SpawnSystem.ts              (2)
  src/inventory/Inventory.ts              (3)
  src/inventory/Extraction.ts             (3)
  src/inventory/Healing.ts                (3)
  src/inventory/Crafting.ts               (3)
  src/inventory/HolyZone.ts               (3)
  src/ui/InventoryView.ts                 (3)
  src/debug/CaffeineLedger.ts             (3, 감소 표시 골격 1)
  src/save/schema.ts                     (4)
  src/save/migrations.ts                 (4)
  src/save/IndexedDbStore.ts             (4)
  src/save/SaveCoordinator.ts            (4)
  src/save/DeathJournal.ts               (4)
  src/save/CloudSync.ts                  (4)
  src/firebase/client.ts                 (4)
  src/firebase/auth.ts                   (4)
  src/ui/SaveComparison.ts               (4)
  firestore.rules                       (4)
  firebase.json                         (4, 로컬 QA 에뮬레이터)
  src/stages/Stage.ts                    (5)
  src/stages/StageManager.ts             (5)
  src/stages/Office.ts                   (5)
  src/stages/DemonCity.ts                (5)
  src/stages/Subway.ts                   (5)
  src/stages/LavaVista.ts                (6, 풍경 전용)
  src/bosses/DevilTrain.ts                (6)
  src/audio/SynthAudio.ts                (7)
  render.yaml                           (7)
  THIRD_PARTY_NOTICES.md                 (7)
  tests/resources.test.ts               (1)
  tests/movement.test.ts                (1)
  tests/extraction.test.ts              (3)
  tests/crafting.test.ts                (3)
  tests/serialization.test.ts           (4)
  tests/migrations.test.ts              (4)
  tests/saveConflicts.test.ts           (4)
  tests/permadeath.test.ts              (4)
  tests/firestore.rules.test.ts         (4)
```

1단계 공간은 이동 검증용이다. 제품 스테이지3종은 5단계에서 구성한다.

## 모듈 의존 관계

| 모듈 | 참조 대상 | 책임 |
|---|---|---|
| main/Game | core·각 시스템 | 생성·접속·이벤트 조정 |
| core | config·시스템 인터페이스 | 고정 timestep·입력·상태 전이 |
| player/physics | config·공통 타입·Three.js | 이동·충돌·자원. Firebase 참조 없음 |
| combat/enemies/bosses | player·physics·assets·config | 공격·AI·스폰·보스 |
| inventory | config·자원 갱신 함수 | 추출·회복·제작의 원자적 확정 |
| stages | 시스템 생성 API·assets | 스테이지 소유 객체와 해제 |
| ui | 읽기용 상태·동작 콜백 | DOM 표시. 게임 데이터 직접 수정 금지 |
| save | schema·migrations·저장 어댑터 | 로컬 우선·충돌·종료 상태 보호 |
| firebase | Firebase SDK | env·인증·Firestore I/O |
| assets/audio | Three.js/Web Audio | registry를 에셋 교체 창구로 사용 |

물리는 직접 구현한다. 정적인 바닥·벽 중심 맵으로 제한해 의존성을 줄이고 이동·충돌을 고정 timestep으로 함께 검증하기 위해서다. 플레이어는 직립 캡슐, 벽·바닥은 AABB이며 이동과 투사체에 sweep 판정을 쓴다. 동적 강체와 복잡한 경사면은 제외한다.

런타임 의존성은 three·firebase를 예정한다. 개발용은 typescript·vite·vitest와 필요한 Three.js 타입 정의다. 정확한 버전·호환성은 확인 필요. 1단계에서 공식 자료·배포 메타데이터·Node 요구사항을 확인하고 버전과 lockfile을 고정한다. Rules 검증용 개발 의존성은 4단계에서 확인한다.

## 상태 머신

| 상태 | CAF·적·물리 | 포인터 락 | 전이 |
|---|---|---|---|
| MENU | 정지 | 해제 | 새 게임/이어하기→LOADING. 설정·크레딧·세이브 비교는 내부 패널 |
| LOADING | 정지 | 해제 | 검증·로딩 완료→PAUSED, 실패→MENU에 이유 표시 |
| PLAYING | 진행 | 필요 | Tab→INVENTORY, ESC/예상 밖 락 해제→PAUSED, 사망→DEAD, 마지막 출구→ENDING |
| INVENTORY | 진행 | 해제 | 제작·추출·회복 가능. 재개 클릭+락 성공→PLAYING. ESC/비활성→PAUSED. 사망→DEAD |
| PAUSED | 정지 | 해제 | 재개 클릭+락 성공→PLAYING, 메뉴 선택→MENU |
| DEAD | 정지 | 해제 | 일반 난이도만 체크포인트→LOADING. 부활 불가 도전은 메뉴로만 이동 |
| ENDING | 게임 정지, 풍경/UI만 갱신 | 해제 | 풍경5초→지정 엔딩2행, 메뉴 복귀 |

인벤토리 상태·의도된 해제 이유를 먼저 정하고 락을 해제한다. pointerlockchange가 인벤토리를 PAUSED로 바꾸지 않게 한다. ESC의 keydown과 pointerlockchange가 함께 와도 전이는 한 번뿐이다. 재개 클릭은 발사에 전달하지 않는다. blur·락 상실·화면 전환에서 키 상태를 초기화한다.

## 게임 루프

렌더는 requestAnimationFrame, 시뮬레이션은 고정 timestep이다. 활성 상태 프레임 지연은 delta를 버리지 않고 잔여 계산을 다음 프레임으로 넘긴다. 정지 진입 시점까지의 미처리 활성 시간도 정산한다. 숨겨진 탭의 정지 시간을 복귀 후 따라잡지 않는다. 인벤토리는 정지 상태가 아니다.

입력 의도→이동·현재 구역 판정→공격/피해·자연 감소→사망 판정→생존 시 추출/회복/제작 확정→신성지대 최초 효과·저장→진행 판정 순이다. HP·CAF가 같은 tick에서0이면 both로 기록한다. 사망과 회복·출구 도달이 겹치면 사망이 우선한다.

## 리스크 대응 계획

| 리스크 | 대응 |
|---|---|
| CAF 부족 | 환산은 고정, 드롭·스폰·배치만 조정. 첫 공급까지 이동6초 이내 목표, 보스전 보급 적 배치. 실측 전 합격 판정 금지 |
| 분당 수지 | 바깥 소비120CAF/분. debug에 잠재 공급·실제 추출 증가·소비·순증감·상한 손실·처치 시간·신성지대 도달 시간을 표시. 정지 시간 제외, 신성지대 회복 별도 표시 |
| 독립적 사망 | hp/caffeine/both 기록. 사망 확정 후 회복·클리어로 전환 금지 |
| 오버차지 | Resources의 단일 clamp로 HP[0,150]·CAF[0,300]·STA[0,100]. 모든 회복·부활이 사용. 로드 시 타입·유한값 검증 |
| 추출/제작 경쟁 | 추출 시작 시 재료 예약, 완료 시 재검증 후 소비와 회복 원자 확정. 제작도 재료 검증·소모·생성을 한 번에 처리. 사망·스테이지 해제로 예약 취소 |
| 자동 회복 | 획득은 수량만 증가. H/인벤토리 사용만 HP 증가. HP150/CAF300에서는 해당 회복·추출을 소비하지 않음 |
| 드롭 유실 | 수량 상한 초과분은 바닥에 유지. 풀 부족 시 일반 재료 합치기. 보스 뇌는 폐기하지 않음 |
| 신성지대 반복 효과 | 최초 플래그·회복·체크포인트를 같은 로컬 트랜잭션에 포함. 재진입·재로딩으로 플래그 초기화 금지 |
| 부활 불가 사망 | 동일 runId 종료는 불가역. 작은 동기 localStorage 사망 저널을 보조 기록하고 IDB의 종료 기록·세이브·outbox를 원자 저장. 클라우드 실패해도 재개 차단 |
| 새로고침/저장 실패 | 일반 세이브보다 사망 저널을 먼저 적용. 완료 전 성공 표시 금지. 저장장치 쓰기 불능은 명시하며 보장으로 주장하지 않음 |
| 여러 탭 | 같은 로컬 슬롯의 동시 진행을 소유권으로 제한, 사망 전파. API 지원·대안은4단계 확인 |
| 다른 기기의 사망 | 동기화 시 같은 도전의 사망을 먼저 적용해 생존판 선택 차단. 미전달 원격 오프라인 사망·악의적 복제는 완전 방지 불가 |
| 일반 저장 충돌 | 시각만으로 자동 채택하지 않음. stage/checkpoint·playTime·시각·runId·상태 비교 후 선택. 선택 전 양쪽 원본 보존 |
| 전송 순서 역전 | 계정/슬롯별 영속 큐·revision/generation 비교·Firestore transaction. 새 도전은 명시 동작으로만 생성 |
| 사망 덮어쓰기 | Rules에서 동일 run dead→active·같은 세대 runId/난이도 교체·구세대 쓰기 거부. 삭제 후 같은 도전 재생성 차단 |
| 계정 전환 | guest/UID별 로컬 공간·큐 분리. 다른 UID로 이전 큐 전송 금지. 게스트 가져오기는 비교 선택 |
| Firestore 과다 쓰기 | 루프/HUD 직접 호출 금지. 최초 CP·스테이지 완료·보스 처치·질문2 사망 예외만 저장 큐에 전달. 설정은 로컬만 |
| 빠른 이동/메모리 | 이동 sweep·투사체 선분 충돌. 머리 위가 막히면 슬라이드 후 기립 불가. StageManager가 메시/GPU 자원·콜라이더·적·풀·예약·구독 해제 |
| 순수한 영혼 진행 | 무기 요구 튜토리얼 분기 대체. 보스에 지상 근접 표적 제공. 맨손1에 적 방어 보정 적용 안 함 |

## 저장 계약

경로는 users/{uid}/saves/{slotId}, slotId는1/2/3이다. schemaVersion·runId·generation·revision·runStatus·difficulty·stageId·checkpointId·playerName·자원·무기/탄약·아이템/재료·holyZoneFlags·bossFlags·demoCompleted·playTimeSeconds·updatedAt을 저장한다. 정확한 좌표는 저장하지 않고 CP 위치로 복원한다. 스테이지4는 플레이 가능한 저장 ID로 사용하지 않는다.

Rules는 UID·허용/필수 필드·자료형·자원 범위·개수의 비음수 정수·알려진 ID·이름 길이·플레이 시간·상태 전이를 검사한다. 인벤토리·무기·플래그는 고정 키 map으로 하위 항목을 열거 검증한다. map/list 자료형만 검사하고 모든 원소를 검사했다고 취급하지 않는다.

IDB 성공 후 클라우드 전송. 오프라인은 앱의 IDB 큐에 보관하고 재연결 시 서버 데이터와 비교하여 transaction을 재시도한다. SDK의 마지막 쓰기 우선에 맡기지 않고 updatedAt만으로 선택하지 않는다. Firestore transaction은 오프라인에서 성공할 수 없다.

## 자가 검증

상수 파일을 위에서 아래로 검토했다. import·함수 호출·미정의 함수 참조가 없다. Node v24.22.1에서 두 TS 모듈 로드 성공, SPEC/구성 대조27개 통과, 임시값 정의99줄의 TBD 주석 확인. 이는 strict 타입 검사나 게임 실행 테스트가 아니다.

| 확정 항목 | SPEC | 코드 근거 |
|---|---|---|
| HP 기본/상한 | 100/150 | RULES.resources |
| CAF 기본/상한/감소 | 100/300/초당2 | RULES.resources |
| STA 상한/회복 | 100/초당1 | RULES.resources |
| 대시/슬라이드 비용 | 10/15 | RULES.resources |
| 점프 | 최대2회 | RULES.maxJumps |
| 정수/심장/뇌 | 25→5/1→20/1→250CAF | RULES.extraction |
| 회복품4종 | HP+10/+20/+30/+50 | RULES.healing |
| 기관 샤프 제작 | 샤프2·샤프심통1·심장3 | RULES.doubleBarrelRecipe |
| 순수한 영혼 | 맨손1·무기/부활 금지·추출 허용 | RULES.pureSoul |
| H/슬롯 | KeyH/3개 | RULES.quickHealKey/saveSlotIds |

| 제17.2장QA | 판정 | 코드 근거/검증 단계 |
|---|---|---|
| 시작 직후 검은 화면 없음 | 미검증 | 1/5단계 브라우저 |
| 카메라 정상 | 미검증 | 1단계 |
| 대시·슬라이드 소모 | 미검증 | 10/15 상수만 정의,1단계 |
| STA 초당1 | 미검증 | 1 상수만 정의,1단계 |
| CAF 초당2 | 미검증 | 2 상수만 정의,1단계 |
| CAF0 사망 | 미검증 | 1단계 |
| HP0 사망 | 미검증 | 1단계 |
| HP150 이하 | 미검증 | 150 정의만 존재,clamp는1단계 |
| 획득만으로 회복 안 함 | 미검증 | 3단계 |
| H 회복 | 미검증 | KeyH만 정의,3단계 |
| 추출 없이 CAF 충전 안 함 | 미검증 | 3단계. 최초 신성지대/일반 부활의 지정 회복은 별도 경로 |
| 제작·추출 재료 소모 | 미검증 | 3단계 |
| 인벤토리 중 CAF 감소 | 미검증 | 1/3단계 |
| 신성지대 CAF 정지 | 미검증 | 3단계 |
| 최초 회복 반복 불가 | 미검증 | 3/4단계 |
| 보스 사망·뇌 드롭 | 미검증 | 6단계 |
| 보스 처치 저장 | 미검증 | 4/6단계 |
| 새로고침 후 로컬 유지 | 미검증 | 4단계 |
| 다른 PC 이어하기 | 미검증 | Firebase 실환경4/7단계 |
| 다른 UID 거부 | 미검증 | Rules emulator4·실환경7단계 |
| 종료 도전 재개 불가 | 미검증 | 4/6단계. 미전달 원격 오프라인 사망은 위 한계 |
| 재배포 후 세이브 유지 | 미검증 | 마이그레이션4·동일 origin Render7단계 |

| 엣지 케이스 | 처리 계획 | 검증 |
|---|---|---|
| 프레임 드롭 | 고정 tick 잔량 보존·시간 미폐기 | 미검증,1 |
| 탭 복귀 | 자동 정지·입력 해제·클릭 재개·정지 시간 제외 | 미검증,1 |
| HP/CAF 동시0 | both로 한 번만 사망 | 미검증,1 |
| 추출 중 사망 | 확정 전 소비 취소·예약 해제·회복 금지 | 미검증,3 |
| CAF300 추출 | 사용 금지·재료 유지 | 미검증,3 |
| HP140/CAF250 첫 신성지대 | 140/250 유지·플래그·저장 | 미검증,3/4 |
| 2단 점프 후 슬라이드 | 공중 시작/소모 불가·착지 후 새 입력 필요 | 미검증,1 |
| 저장 중 새로고침 | 부팅 시 사망 저널·IDB 트랜잭션 대조 | 미검증,4 |
| 미래 버전/손상 세이브 | 원본 보존·자동 덮어쓰기 금지·이유 표시 | 미검증,4 |
| 보스와 동시 사망 | 사망 우선·진행 가능한 클리어로 전환 금지 | 미검증,6 |
| 풀 고갈 | 확장 금지·투사체 확보 실패 시 탄 미소모·재료 합치기·뇌 유지 | 미검증,2/3/6 |

0단계에는 순수 로직 구현이 없어 Vitest 파일을 만들지 않는다. 1단계에서 clamp·시간 자원·STA 지불, 3단계에서 추출/예약·회복·제작 원자성, 4단계에서 직렬화·마이그레이션·충돌·종료 상태 단조성을 테스트한다. Rules는 에뮬레이터 통합 테스트로 검증한다.

## (a) 내가 정한 기본값 목록

거리m·속도m/s·시간초다. 임시값은 모두 tunables.ts의 // TBD: 기획 미확정 주석 대상이다. 추가로 필요한 미정 좌표·연출값도 이 파일에만 추가하고 해당 단계에서 목록을 갱신한다.

| 분류 | 임시 기본값 |
|---|---|
| 시간/비활성 | 60Hz·프레임당8tick·잔량 보존·blur/hidden 자동 정지 |
| 이동 | 걷기6·달리기9·중력24·점프8/8 |
| 대시 | F·속도20·0.18초·대기0.3초·공중 가능·이동 방향/무입력 시 시선 전방 |
| 슬라이드 | C/Ctrl·속도12·0.65초·대기0.3초·지상만 |
| STA 미정 부분 | 시작100·달리기/점프 비용0·회복 지연0 |
| 체형 | 반경0.35·키1.8·슬라이드 높이0.9·눈1.65·단차0.3 |
| 키 | WASD·Shift·Space·E·Tab·X추출·R재장전·숫자1~7무기·H/ESC예약 |
| 카메라/품질 | FOV90도·감도0.002rad/px·상하85도·배율1·DPR1.5·그림자medium |
| 표시/색/음량 | SFX0.7·BGM0.25·흔들림0.5·FPS끔·자막/설명켬. 배경#170d16·위험#ff513b·CAF#ffa22a·신성#9fe5ff |
| 커터칼 | 피해35·간격0.35·거리2 |
| 스테이플러 | 피해18·간격0.22·탄창12/예비72·장전1.15·거리60 |
| 수리검 | 피해32·간격0.45·속도28·수명4·초기0발 |
| 연필깎기 | 6×3발·퍼짐5도·간격0.12·40/160·장전1.4·속도40·거리35 |
| 배터리 | 피해100·반경4·충전0.6·투척 뒤 신관1.5·속도16·간격1·획득 시3개 |
| 기관 샤프 | 8×2발·간격0.09·60/180·장전1.8·속도60·거리55·발사당 탄2소모 |
| 저격총 | 피해100·간격1.1·5/20·장전1.9·거리120 |
| 맨손 동작 | 간격0.2·거리1.6. 피해1은 확정값 |
| 적4유형 | 근접HP80/피해8/속도2.8/간격1/거리1.6, 원거리60/6/2.4/1.4/18/탄속10, 고속40/5/5.2/0.6/1.4, 중장갑200/16/1.8/1.8/1.8. 중장갑은 높은HP로 구별 |
| 스폰/AI | 전체18/구역6·10초당1·거리8 이상, 근처10Hz/먼곳2Hz·감지28·내비셀1 |
| 기본 재료 | 정수300+심장1=잠재80CAF/마리,2마리/분이면160-120=+40CAF/분·실제 추출/상한 손실 별도 |
| 회복품 확률 | 사탕10%·에스프레소6%·라떼4%·보드카2%·배타 추첨 합22% |
| 제작 재료 확률 | 날40%·샤프15%·심통12%·독립 추첨 |
| 탄약 | 50%·장착/보유 우선·스테이플24/부산물40/샤프심40/저격심2 중 해당 묶음 |
| 획득/보관 | 반경1.4 자동 획득·일반 드롭180초·뇌 유지·종류별9999·슬롯 무제한 |
| 추출 | X로 선택 재료 수동 사용·0.8초·정수 최대12묶음/심장1/뇌1·이동 가능/공격 금지·재료 선택은 인벤토리·초기 정수 |
| 회복 사용 | 0.25초·대기0.5초·150까지 부족분을 채우는 최소 품목/없으면 최대·상한에서 미소모 |
| 수리검 제작 | 임시 날3+정수25→3발 |
| 신성지대 | HP/CAF 기본치 이상·오버차지 보존·적/적탄 진입 불가·수동 진행 저장 없음 |
| 부활/종료 | 일반은CP 자산/STA+HP/CAF 기본치 이상·순수한 영혼 회복품 허용·사망/완료 슬롯 보존·명시적 새 도전 |
| 난도 HP/공격/재료 배율 | 아기0.5/0.5/1.5·쉬움0.75/0.75/1.25·보통1/1/1·하드1.3/1.4/1·나머지1/1/1·재료 수량 내림·확정 자원/맨손1에는 적용 안 함 |
| 맵 | 사무실3구역16×14/통로8/신성1·도시4구역36×30/통로12/신성2·지하철3구역30×18/통로14/신성2·첫 재료까지 이동6초 이내 목표 |
| 시간 목표 | 6/12/12분=30분·강제 대기 없음·실측 전 미검증 |
| 보스 | HP1600·2페이즈·50% 전환·48×32·근접 표적 높이1.2·빈틈2초·뇌1개 |
| 보스 공격 | 선로 휩쓸기20/예고1.2/대기8, 서류탄8×5/예고0.8/대기5/속도12, 내려찍기25/예고1.4/대기10/반경3 |
| 보스 보급 적 | 18초당1·최대4·전체 상한 포함 |
| 풍경/풀 | 풍경5초·투사체256·드롭256·파티클512·시체2초 |
| debug | 측정60초·CAF25 이하 경고 |
| 저장 보조 | 재시도2/5/15/30/60초·이름32 UTF-16단위·시간 상한31536000초 |
| 합성음 | 발사440Hz·명중110·획득660·경고1760·BGM기본55 |

## (b) 미검증 항목

TypeScript strict·의존성 설치·npm ci·Vite dist 빌드·Vitest·실제 게임 브라우저 실행·포인터 락/음향/GPU·실제 난이도/25~40분·IDB 장애/즉시 새로고침·Firebase/Rules/다른 기기·Render는 실행 검증 안 됨. Node 상수 로드/대조 통과를 게임 QA 통과로 취급하지 않는다.

직접 확인 순서: 1단계 빌드/이동/시점/50초 CAF 사망→3단계 수동 추출/회복/제작/신성지대→4단계 새로고침/통신 실패/충돌/사망 복원→6단계 보스/난도→7단계 Render/다른 PC 동기화.

## (c) 내가 해야 할 일

0단계에는 외부 설정이 필요 없다. 추천안 수정이 있으면 알려주면 된다.

- 4단계: Firebase 프로젝트·Google 로그인·Firestore 준비, .env.example의 VITE_* 공개 설정 입력, Rules 배포. 관리자/서비스 계정 키는 제공하거나 코드에 넣지 않는다.
- 7단계: GitHub를 Render Static Site에 연결, 빌드 npm ci && npm run build, 게시 dist 설정.
- 배포 후: Render 도메인을 Firebase 승인 도메인에 추가하고 게스트·로그인·타UID 거부·다른 PC 동기화를 확인.
- 같은 origin에서 저장 유지 검증. 도메인 변경/브라우저 데이터 삭제 시 IDB 자동 이전은 불가능하다.

0단계에서 멈춘다. 다음 지시 전에는 1단계를 시작하지 않는다.

## 확인한 공식 자료

- Pointer Lock: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
- Firestore transactions: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firestore 필드 검증: https://firebase.google.com/docs/firestore/security/rules-fields
- Vite 환경 요구사항: https://vite.dev/guide/

