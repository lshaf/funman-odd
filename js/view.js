$(document).ready(function () {
  let master = {};
  let totalOdd = 0;
  let eName = $("#name");
  let eTable = $("#table-data");
  let eFile = $("#open");
  let btnLoad = $(".btn-load");
  let btnWcw = $(".btn-wcw");
  let btnAnchor = $(".btn-anchor");
  let btnLogout = $(".btn-logout");

  let db = eTable.DataTable({
    serverSide: false,
    autoWidth: false,
    processing: true,
    searching: false,
    pageLength: 9999,
    paging: false,
    bInfo: false,
    columns: [
      {
        title: "Odd",
        data: "odd",
        width: 100,
        class: ['text-end']
      },
      {
        title: "Reward",
        data: "reward",
        orderable: false,
        render: function (data) {
          if (data == "") return "-";
          let full = master[data];
          return `[${full.id}] ${full.name}`;
        }
      },
      {
        title: "%",
        data: "odd",
        orderable: false,
        render: function (data) {
          if (totalOdd === 0) return 0;
          return Number(data / totalOdd * 100).toLocaleString("en", {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5
          });
        }
      },
    ]
  });

  btnLoad.on('click', function () {
    if (session.wallet === "") {
      alert("Please login first");
      return;
    }

    eFile.click();
  });

  eFile.on('change', function (e) {
    let files = e.target.files;
    if (files.length === 0) {
      alert("Please select file");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', (ev) => {
      let loaded = JSON.parse(ev.target.result);
      eName.val(loaded.name);

      totalOdd = 0;
      let formatted = {};
      for (let x of loaded.odds) {
        let req = x[2] || "";
        if (req !== "" && session.items[req] === undefined)
          continue;

        totalOdd += x[0];
        if (formatted[x[1]] === undefined) {
          formatted[x[1]] = {
            odd: 0,
            reward: x[1],
          }
        }

        formatted[x[1]].odd += x[0];
      }

      db.clear();
      db.rows.add(Object.values(formatted));
      db.draw();
    });
    reader.readAsText(files[0], 'utf-9');
  });

  btnLoad.attr("disabled", true);
  $.ajax({
    url: "./db/funman.json",
    success: function (r) {
      master = r;
      btnLoad.attr("disabled", false);
    }
  });

  const aaApi = new atomicassets.ExplorerApi("https://wax.api.atomicassets.io", "atomicassets", {fetch})
  const session = {wallet: "", items: {}};
  const wax = new waxjs.WaxJS({rpcEndpoint: 'https://wax.greymass.com'});
  const anchorTransport = new AnchorLinkBrowserTransport();
  const anchor = new AnchorLink({
      transport: anchorTransport,
      chains: [
          {
              chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4',
              nodeUrl: 'https://wax.greymass.com',
          },
      ],
  });

  async function fetchItems() {
    session.items = {};
    if (session.wallet === "") {
      return;
    }

    let page = 1;
    let limit = 1000;
    while (true) {
      let items = await aaApi.getAssets({
        owner: session.wallet,
        collection_name: "funmangalaxy",
        sort: "asc",
      }, page++, limit);

      for (let item of items) {
        let t_name = item.name.trim();
        let k_name = t_name.toLowerCase().replace(/[^\w\s]+/gi, '').replace(/\s+/gi, "_");
        if (session.items[k_name] === undefined) {
          session.items[k_name] = 0;
        }

        session.items[k_name]++;
      }

      if (items.length < limit) break;
    }

    $(".user-display").removeClass('d-none');
    $(".login-button").addClass("d-none");
    $(".user-display .wallet-name").html(session.wallet);
  }

  btnWcw.on('click', async function () {
    try {
      let wallet = await wax.login();
      session.wallet = wallet;
      await fetchItems();
      console.log("logged in as", wallet);
    } catch(e) {
      console.log(e.message);
    }
  });

  btnAnchor.on('click', async function() {
    // Perform the login, which returns the users identity
    const identity = await anchor.login('funman-odd');
    let wallet = identity.session.auth.actor.toString();
    session.wallet = wallet;
    await fetchItems();
    // Save the session within your application for future use
    console.log(`Logged in as`, wallet);
  });

  btnLogout.on('click', function () {
    session.wallet = "";
    session.items = {};
    $(".user-display").addClass('d-none');
    $(".login-button").removeClass("d-none");
  })
});